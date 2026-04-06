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
    user_id: str
    role: str


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/", response_model=DocumentResponse)
async def create_document(body: CreateDocRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await DocumentService.create(db, body.title, user)
    return DocumentResponse(
        id=str(doc.id), title=doc.title,
        content=doc.content, revision=doc.revision,
        owner_id=str(doc.owner_id)
    )


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    docs = await DocumentService.get_user_documents(db, user)
    return [DocumentResponse(
        id=str(d.id), title=d.title,
        content=d.content, revision=d.revision,
        owner_id=str(d.owner_id)
    ) for d in docs]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not await PermissionService.can_view(db, doc.id, user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    return DocumentResponse(
        id=str(doc.id), title=doc.title,
        content=doc.content, revision=doc.revision,
        owner_id=str(doc.owner_id)
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    role = await PermissionService.get_role(db, doc.id, user.id)
    if role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    await DocumentService.delete(db, doc)
    return {"message": "Document deleted"}


@router.post("/{doc_id}/permissions")
async def grant_permission(doc_id: str, body: GrantPermissionRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    role = await PermissionService.get_role(db, doc.id, user.id)
    if role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Only owner can manage permissions")
    try:
        new_role = RoleEnum(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role. Use owner, editor, or viewer")
    await PermissionService.grant(db, doc.id, uuid.UUID(body.user_id), new_role)
    return {"message": f"Permission granted: {body.role}"}


@router.get("/{doc_id}/versions")
async def get_versions(doc_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await DocumentService.get(db, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not await PermissionService.can_view(db, doc.id, user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    versions = await VersionService.get_versions(db, doc.id)
    return [{"id": str(v.id), "revision": v.revision, "snapshot": v.snapshot, "created_at": str(v.created_at)} for v in versions]