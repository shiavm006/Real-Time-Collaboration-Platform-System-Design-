import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.base import get_db, AsyncSessionLocal
from db.models import OperationLog
from services.auth_service import AuthService
from services.document_service import DocumentService
from services.permission_service import PermissionService
from services.version_service import VersionService
from ot_engine.document import Document
from ot_engine.operation import OperationFactory

router = APIRouter(tags=["websocket"])

# Observer Pattern — ConnectionManager observes all active connections
# and broadcasts to all subscribers of a document room
class ConnectionManager:
    """
    Manages WebSocket connections per document room.
    Singleton — one instance shared across the app.
    Observer Pattern — clients subscribe to a doc_id channel.
    """
    def __init__(self):
        # doc_id -> list of (websocket, user_id)
        self._rooms: dict[str, list[tuple[WebSocket, str]]] = {}
        # doc_id -> Document (in-memory OT state)
        self._documents: dict[str, Document] = {}

    async def connect(self, doc_id: str, websocket: WebSocket, user_id: str, content: str, revision: int):
        await websocket.accept()
        if doc_id not in self._rooms:
            self._rooms[doc_id] = []
            self._documents[doc_id] = Document(doc_id, content, revision)
        self._rooms[doc_id].append((websocket, user_id))

        # Send current doc state to newly connected client
        await websocket.send_text(json.dumps({
            "type": "init",
            "content": self._documents[doc_id].content,
            "revision": self._documents[doc_id].revision
        }))

        # Notify others that a new user joined
        await self.broadcast(doc_id, {
            "type": "presence",
            "user_id": user_id,
            "action": "joined",
            "online_users": [uid for _, uid in self._rooms[doc_id]]
        }, exclude=websocket)

    def disconnect(self, doc_id: str, websocket: WebSocket, user_id: str):
        if doc_id in self._rooms:
            self._rooms[doc_id] = [
                (ws, uid) for ws, uid in self._rooms[doc_id]
                if ws != websocket
            ]
            if not self._rooms[doc_id]:
                del self._rooms[doc_id]
                del self._documents[doc_id]

    async def broadcast(self, doc_id: str, message: dict, exclude: WebSocket = None):
        if doc_id not in self._rooms:
            return
        for ws, _ in self._rooms[doc_id]:
            if ws != exclude:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    pass

    def get_document(self, doc_id: str) -> Document | None:
        return self._documents.get(doc_id)


# Singleton instance
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

        await manager.connect(doc_id, websocket, str(user.id), db_doc.content, db_doc.revision)

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

                    # Build operation from message
                    op_data = {**message["operation"], "user_id": str(user.id)}
                    operation = OperationFactory.create(op_data)

                    # Apply OT — transform and apply
                    transformed_op = doc.apply_operation(operation)

                    # Persist operation to DB
                    log = OperationLog(
                        document_id=doc_uuid,
                        user_id=user.id,
                        op_type=transformed_op.get_type().value,
                        position=transformed_op.position,
                        char=getattr(transformed_op, "char", None),
                        revision=transformed_op.revision
                    )
                    db.add(log)

                    # Persist updated content to DB
                    db_doc = await DocumentService.get(db, doc_uuid)
                    await DocumentService.update_content(db, db_doc, doc.content, doc.revision)

                    # Snapshot if needed
                    if await VersionService.should_snapshot(db_doc):
                        await VersionService.create_snapshot(db, db_doc, user)

                    await db.commit()

                # Broadcast transformed op to all other clients
                await manager.broadcast(doc_id, {
                    "type": "operation",
                    "operation": transformed_op.to_dict(),
                    "user_id": str(user.id)
                }, exclude=websocket)

            elif message["type"] == "cursor":
                # Broadcast cursor position to others
                await manager.broadcast(doc_id, {
                    "type": "cursor",
                    "user_id": str(user.id),
                    "position": message.get("position", 0)
                }, exclude=websocket)

    except WebSocketDisconnect:
        async with AsyncSessionLocal() as db:
            manager.disconnect(doc_id, websocket, str(user.id))
            await manager.broadcast(doc_id, {
                "type": "presence",
                "user_id": str(user.id),
                "action": "left",
                "online_users": [uid for _, uid in manager._rooms.get(doc_id, [])]
            })