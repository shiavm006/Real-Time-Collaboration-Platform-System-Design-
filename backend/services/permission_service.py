from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import DocumentPermission, RoleEnum
import uuid


class PermissionService:
    """
    Handles role-based access control.
    Open/Closed — adding a new role doesn't change this class's interface.
    """

    @staticmethod
    async def get_role(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID) -> RoleEnum | None:
        result = await db.execute(
            select(DocumentPermission).where(
                DocumentPermission.document_id == doc_id,
                DocumentPermission.user_id == user_id
            )
        )
        perm = result.scalar_one_or_none()
        return perm.role if perm else None

    @staticmethod
    async def can_edit(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        role = await PermissionService.get_role(db, doc_id, user_id)
        return role in (RoleEnum.owner, RoleEnum.editor)

    @staticmethod
    async def can_view(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        role = await PermissionService.get_role(db, doc_id, user_id)
        return role is not None  # any role can view

    @staticmethod
    async def grant(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID, role: RoleEnum):
        # Check if permission already exists
        result = await db.execute(
            select(DocumentPermission).where(
                DocumentPermission.document_id == doc_id,
                DocumentPermission.user_id == user_id
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.role = role
        else:
            perm = DocumentPermission(document_id=doc_id, user_id=user_id, role=role)
            db.add(perm)
        await db.commit()

    @staticmethod
    async def revoke(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID):
        result = await db.execute(
            select(DocumentPermission).where(
                DocumentPermission.document_id == doc_id,
                DocumentPermission.user_id == user_id
            )
        )
        perm = result.scalar_one_or_none()
        if perm:
            await db.delete(perm)
            await db.commit()