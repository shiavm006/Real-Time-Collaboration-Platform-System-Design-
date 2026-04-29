from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from db.base import get_db
from db.models import RoleEnum
from services.auth_service import AuthService
from services.document_service import DocumentService
from services.permission_service import PermissionService
from services.version_service import VersionService
import uuid

router = APIRouter(prefix="/documents", tags=["documents"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class CreateDocRequest(BaseModel):
    title: str


class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    revision: int
    owner_id: str


class GrantPermissionRequest(BaseModel):
    user_id: str | None = None
    email: str | None = None
    role: str


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    user = await AuthService.get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/", response_model=DocumentResponse)
async def create_document(
    body: CreateDocRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await DocumentService.create(db, body.title, user)
    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        content=doc.content,
        revision=doc.revision,
        owner_id=str(doc.owner_id),
    )


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    docs = await DocumentService.get_user_documents(db, user)
    return [
        DocumentResponse(
            id=str(d.id),
            title=d.title,
            content=d.content,
            revision=d.revision,
            owner_id=str(d.owner_id),
        )
        for d in docs
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not await PermissionService.can_view(db, doc.id, user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        content=doc.content,
        revision=doc.revision,
        owner_id=str(doc.owner_id),
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    role = await PermissionService.get_role(db, doc.id, user.id)
    if role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    await DocumentService.delete(db, doc)
    return {"message": "Document deleted"}


@router.post("/{doc_id}/permissions")
async def grant_permission(
    doc_id: str,
    body: GrantPermissionRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    role = await PermissionService.get_role(db, doc.id, user.id)
    if role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Only owner can manage permissions")
    try:
        new_role = RoleEnum(body.role)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid role. Use owner, editor, or viewer"
        )

    target_user_id = None
    if body.user_id:
        target_user_id = uuid.UUID(body.user_id)
    elif body.email:
        target_user = await AuthService.get_user_by_email(db, body.email)
        if not target_user:
            raise HTTPException(
                status_code=404, detail="User with this email not found"
            )
        target_user_id = target_user.id
    else:
        raise HTTPException(status_code=400, detail="Must provide user_id or email")

    await PermissionService.grant(db, doc.id, target_user_id, new_role)
    return {"message": f"Permission granted: {body.role}"}


@router.get("/{doc_id}/permissions")
async def get_permissions(
    doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not await PermissionService.can_view(db, doc.id, user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    perms = await PermissionService.get_document_permissions(db, doc.id)
    return [
        {
            "user_id": str(p.user.id),
            "email": p.user.email,
            "full_name": p.user.full_name,
            "role": p.role.value,
        }
        for p in perms
    ]


@router.get("/{doc_id}/versions")
async def get_versions(
    doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not await PermissionService.can_view(db, doc.id, user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    versions = await VersionService.get_versions(db, doc.id)
    return [
        {
            "id": str(v.id),
            "revision": v.revision,
            "snapshot": v.snapshot,
            "created_at": str(v.created_at),
        }
        for v in versions
    ]


@router.post("/{doc_id}/versions/{version_id}/restore")
async def restore_version(
    doc_id: str,
    version_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    role = await PermissionService.get_role(db, doc.id, user.id)
    if role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Only owner can restore versions")

    versions = await VersionService.get_versions(db, doc.id)
    target_version = next((v for v in versions if str(v.id) == version_id), None)
    if not target_version:
        raise HTTPException(status_code=404, detail="Version not found")

    await VersionService.restore(db, doc, target_version)

    # Broadcast to all connected clients so they reload immediately
    from routers.websocket import manager
    import json

    await manager.broadcast(
        doc_id, {"type": "init", "content": doc.content, "revision": doc.revision}
    )

    return {"message": "Version restored"}
