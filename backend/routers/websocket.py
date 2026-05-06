import json
import uuid
import os
import asyncio
import redis.asyncio as aioredis
from dotenv import load_dotenv

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from db.base import AsyncSessionLocal
from services.auth_service import AuthService
from services.document_service import DocumentService
from services.permission_service import PermissionService
from services.ot_service import OTService
from ot_engine.document import Document

load_dotenv()
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

router = APIRouter(tags=["websocket"])


# Observer Pattern — ConnectionManager observes all active connections
# and broadcasts to all subscribers of a document room.
class ConnectionManager:
    """
    Manages WebSocket connections per document room.
    Singleton — one instance shared across the app.
    Observer Pattern + Redis Pub/Sub for multi-server horizontal scaling.
    """

    def __init__(self):
        # doc_id -> list of (websocket, user_id, connection_id, full_name)
        self._rooms: dict[str, list[tuple[WebSocket, str, str, str]]] = {}
        # doc_id -> Document (in-memory OT state)
        self._documents: dict[str, Document] = {}
        # doc_id -> asyncio.Task (the Redis listener loop for this room)
        self._pubsub_tasks: dict[str, asyncio.Task] = {}

        # Initialize Redis global connection pool
        self.redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    def _online_users(self, doc_id: str) -> list[str]:
        """Distinct user_ids in a room (one entry per user, not per connection)."""
        seen: dict[str, None] = {}
        for _, uid, _, _ in self._rooms.get(doc_id, []):
            seen.setdefault(uid, None)
        return list(seen.keys())

    async def connect(
        self,
        doc_id: str,
        websocket: WebSocket,
        user_id: str,
        full_name: str,
        content: str,
        revision: int,
    ) -> str:
        """Accepts connection, yields unique connection_id, starts pubsub if needed."""
        await websocket.accept()
        connection_id = str(uuid.uuid4())

        if doc_id not in self._rooms:
            self._rooms[doc_id] = []
            self._documents[doc_id] = Document(doc_id, content, revision)

            # Subscribe to Redis channel for this exact document
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(f"doc_channel:{doc_id}")
            task = asyncio.create_task(self._pubsub_listener(doc_id, pubsub))
            self._pubsub_tasks[doc_id] = task

        self._rooms[doc_id].append((websocket, user_id, connection_id, full_name))

        # Send current doc state to newly connected client directly (local action)
        await websocket.send_text(
            json.dumps(
                {
                    "type": "init",
                    "content": self._documents[doc_id].content,
                    "revision": self._documents[doc_id].revision,
                }
            )
        )

        # Notify the room that a new user joined
        await self.broadcast(
            doc_id,
            {
                "type": "presence",
                "user_id": user_id,
                "full_name": full_name,
                "action": "joined",
                "online_users": self._online_users(doc_id),
            },
        )

        return connection_id

    async def _pubsub_listener(self, doc_id: str, pubsub):
        """Asynchronous background daemon waiting for cross-server Redis payloads."""
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                payload = json.loads(message["data"])

                # Internal kick signal — close every local socket of the named user.
                if payload.get("type") == "_kick":
                    target_uid = payload.get("user_id")
                    reason = payload.get("reason", "permission_revoked")
                    targets = [
                        (ws, cid)
                        for ws, uid, cid, _ in self._rooms.get(doc_id, [])
                        if uid == target_uid
                    ]
                    for ws, _cid in targets:
                        try:
                            await ws.send_text(
                                json.dumps({"type": "kicked", "reason": reason})
                            )
                        except Exception:
                            pass
                        try:
                            await ws.close(code=1008)
                        except Exception:
                            pass
                    continue

                exclude_conn_id = payload.get("_exclude_conn_id")
                # Fanout to local sockets
                for ws, _uid, cid, _name in self._rooms.get(doc_id, []):
                    if cid != exclude_conn_id:
                        try:
                            await ws.send_text(message["data"])
                        except Exception:
                            pass
        except asyncio.CancelledError:
            await pubsub.unsubscribe(f"doc_channel:{doc_id}")

    def disconnect(self, doc_id: str, websocket: WebSocket):
        if doc_id not in self._rooms:
            return
        self._rooms[doc_id] = [
            (ws, uid, cid, name)
            for ws, uid, cid, name in self._rooms[doc_id]
            if ws != websocket
        ]
        if not self._rooms[doc_id]:
            # Tear down the room entirely when empty
            del self._rooms[doc_id]
            del self._documents[doc_id]
            if doc_id in self._pubsub_tasks:
                self._pubsub_tasks[doc_id].cancel()
                del self._pubsub_tasks[doc_id]

    async def broadcast(self, doc_id: str, message: dict, exclude_conn_id: str = None):
        """Pushes state out via Redis so ALL servers receive it."""
        if exclude_conn_id:
            message["_exclude_conn_id"] = exclude_conn_id
        await self.redis.publish(f"doc_channel:{doc_id}", json.dumps(message))

    async def kick_user(self, doc_id: str, user_id: str, reason: str = "permission_revoked"):
        """
        Send a `kicked` message and forcibly close every connection for the
        given user in this room (on this server). Cross-server kicks ride on
        the broadcast channel — every node filters by user_id and closes its
        local sockets.
        """
        # Local: close immediately so the kicked user gets the message synchronously.
        targets = [
            (ws, cid)
            for ws, uid, cid, _ in self._rooms.get(doc_id, [])
            if uid == user_id
        ]
        for ws, _cid in targets:
            try:
                await ws.send_text(json.dumps({"type": "kicked", "reason": reason}))
            except Exception:
                pass
            try:
                await ws.close(code=1008)
            except Exception:
                pass

        # Cross-server: tell other backend nodes hosting this user's sockets to do the same.
        await self.redis.publish(
            f"doc_channel:{doc_id}",
            json.dumps({"type": "_kick", "user_id": user_id, "reason": reason}),
        )

    def get_document(self, doc_id: str) -> Document | None:
        return self._documents.get(doc_id)


# Singleton application instance
manager = ConnectionManager()


@router.websocket("/ws/{doc_id}")
async def websocket_endpoint(doc_id: str, websocket: WebSocket):
    # Authenticate via token in query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        user = await AuthService.get_current_user(db, token)
        if not user:
            await websocket.close(code=1008)
            return

        try:
            doc_uuid = uuid.UUID(doc_id)
        except ValueError:
            await websocket.close(code=1008)
            return

        if not await PermissionService.can_view(db, doc_uuid, user.id):
            await websocket.close(code=1008)
            return

        db_doc = await DocumentService.get(db, doc_uuid)
        if not db_doc:
            await websocket.close(code=1008)
            return

        connection_id = await manager.connect(
            doc_id,
            websocket,
            str(user.id),
            user.full_name,
            db_doc.content,
            db_doc.revision,
        )

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            mtype = message.get("type")

            if mtype == "operation":
                async with AsyncSessionLocal() as db:
                    if not await PermissionService.can_edit(db, doc_uuid, user.id):
                        await websocket.send_text(
                            json.dumps(
                                {"type": "error", "message": "No edit permission"}
                            )
                        )
                        continue

                    doc = manager.get_document(doc_id)
                    if not doc:
                        continue

                    transformed_op_dict = await OTService.process_operation(
                        db, doc_uuid, doc, user, message["operation"]
                    )

                # Acknowledge the sender so it can reconcile its revision
                client_op_id = message.get("operation", {}).get("client_op_id")
                ack_payload: dict = {
                    "type": "ack",
                    "operation": transformed_op_dict,
                    "revision": transformed_op_dict.get("revision"),
                }
                if client_op_id:
                    ack_payload["client_op_id"] = client_op_id
                try:
                    await websocket.send_text(json.dumps(ack_payload))
                except Exception:
                    pass

                # Broadcast transformed op to other rooms members (cluster-wide)
                await manager.broadcast(
                    doc_id,
                    {
                        "type": "operation",
                        "operation": transformed_op_dict,
                        "user_id": str(user.id),
                    },
                    exclude_conn_id=connection_id,
                )

            elif mtype == "cursor":
                # Broadcast cursor globally
                await manager.broadcast(
                    doc_id,
                    {
                        "type": "cursor",
                        "user_id": str(user.id),
                        "full_name": user.full_name,
                        "position": message.get("position", 0),
                    },
                    exclude_conn_id=connection_id,
                )

            # Unknown message types are ignored.

    except WebSocketDisconnect:
        manager.disconnect(doc_id, websocket)
        await manager.broadcast(
            doc_id,
            {
                "type": "presence",
                "user_id": str(user.id),
                "full_name": user.full_name,
                "action": "left",
                "online_users": manager._online_users(doc_id),
            },
        )
    except Exception:
        # Defensive — make sure we always clean up on unexpected errors
        manager.disconnect(doc_id, websocket)
