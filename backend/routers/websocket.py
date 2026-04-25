import json
import uuid
import os
import asyncio
import redis.asyncio as aioredis
from dotenv import load_dotenv

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.base import get_db, AsyncSessionLocal
from services.auth_service import AuthService
from services.document_service import DocumentService
from services.permission_service import PermissionService
from services.ot_service import OTService
from ot_engine.document import Document

load_dotenv()
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

router = APIRouter(tags=["websocket"])

# Observer Pattern — ConnectionManager observes all active connections

# and broadcasts to all subscribers of a document room
class ConnectionManager:
    """
    Manages WebSocket connections per document room.
    Singleton — one instance shared across the app.
    Observer Pattern + Redis Pub/Sub for multi-server horizontal scaling.
    """
    def __init__(self):
        # doc_id -> list of (websocket, user_id, connection_id)
        self._rooms: dict[str, list[tuple[WebSocket, str, str]]] = {}
        # doc_id -> Document (in-memory OT state)
        self._documents: dict[str, Document] = {}
        # doc_id -> asyncio.Task (the Redis listener loop for this room)
        self._pubsub_tasks: dict[str, asyncio.Task] = {}
        
        # Initialize Redis global connection pool
        self.redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    async def connect(self, doc_id: str, websocket: WebSocket, user_id: str, content: str, revision: int) -> str:
        """Accepts connection, yields unique connection_id, starts pubsub if needed."""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        
        if doc_id not in self._rooms:
            self._rooms[doc_id] = []
            self._documents[doc_id] = Document(doc_id, content, revision)
            
            # Subscribing to Redis channel for this exact document!
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(f"doc_channel:{doc_id}")
            task = asyncio.create_task(self._pubsub_listener(doc_id, pubsub))
            self._pubsub_tasks[doc_id] = task
            
        self._rooms[doc_id].append((websocket, user_id, connection_id))

        # Send current doc state to newly connected client directly (Local action)
        await websocket.send_text(json.dumps({
            "type": "init",
            "content": self._documents[doc_id].content,
            "revision": self._documents[doc_id].revision
        }))

        # Notify entire Redis cluster that a new user joined
        await self.broadcast(doc_id, {
            "type": "presence",
            "user_id": user_id,
            "action": "joined",
            "online_users": [uid for _, uid, _ in self._rooms[doc_id]]
        }, exclude_conn_id=connection_id)
        
        return connection_id

    async def _pubsub_listener(self, doc_id: str, pubsub):
        """Asynchronous background daemon waiting for incoming cross-server Redis payloads."""
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    payload = json.loads(message["data"])
                    exclude_conn_id = payload.get("_exclude_conn_id")
                    
                    # Fanout to local nodes
                    for ws, uid, cid in self._rooms.get(doc_id, []):
                        if cid != exclude_conn_id:
                            try:
                                await ws.send_text(message["data"])
                            except Exception:
                                pass
        except asyncio.CancelledError:
            await pubsub.unsubscribe(f"doc_channel:{doc_id}")

    def disconnect(self, doc_id: str, websocket: WebSocket, user_id: str):
        if doc_id in self._rooms:
            self._rooms[doc_id] = [
                (ws, uid, cid) for ws, uid, cid in self._rooms[doc_id]
                if ws != websocket
            ]
            if not self._rooms[doc_id]:
                # Teardown the room entirely when empty
                del self._rooms[doc_id]
                del self._documents[doc_id]
                if doc_id in self._pubsub_tasks:
                    self._pubsub_tasks[doc_id].cancel()
                    del self._pubsub_tasks[doc_id]

    async def broadcast(self, doc_id: str, message: dict, exclude_conn_id: str = None):
        """Pushes state out fully to Redis so ALL servers receive it."""
        if exclude_conn_id:
            message["_exclude_conn_id"] = exclude_conn_id
        await self.redis.publish(f"doc_channel:{doc_id}", json.dumps(message))

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

        doc_uuid = uuid.UUID(doc_id)
        if not await PermissionService.can_view(db, doc_uuid, user.id):
            await websocket.close(code=1008)
            return

        db_doc = await DocumentService.get(db, doc_uuid)
        if not db_doc:
            await websocket.close(code=1008)
            return

        connection_id = await manager.connect(doc_id, websocket, str(user.id), db_doc.content, db_doc.revision)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "operation":
                async with AsyncSessionLocal() as db:
                    # Check edit permission
                    if not await PermissionService.can_edit(db, doc_uuid, user.id):
                        await websocket.send_text(json.dumps({"type": "error", "message": "No edit permission"}))
                        continue

                    # Get in-memory document
                    doc = manager.get_document(doc_id)
                    if not doc:
                        continue

                    # Dependency Injected SRP Facade Engine 
                    transformed_op_dict = await OTService.process_operation(
                        db, doc_uuid, doc, user, message["operation"]
                    )

                # Broadcast transformed op globally to cluster
                await manager.broadcast(doc_id, {
                    "type": "operation",
                    "operation": transformed_op_dict,
                    "user_id": str(user.id)
                }, exclude_conn_id=connection_id)

            elif message["type"] == "cursor":
                # Broadcast cursor globally
                await manager.broadcast(doc_id, {
                    "type": "cursor",
                    "user_id": str(user.id),
                    "position": message.get("position", 0)
                }, exclude_conn_id=connection_id)

    except WebSocketDisconnect:
        async with AsyncSessionLocal() as db:
            manager.disconnect(doc_id, websocket, str(user.id))
            await manager.broadcast(doc_id, {
                "type": "presence",
                "user_id": str(user.id),
                "action": "left",
                "online_users": [uid for _, uid, _ in manager._rooms.get(doc_id, [])]
            })