from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Document, DocumentPermission, RoleEnum, User
import uuid


class DocumentService:
    """
    Handles document CRUD.
    Single Responsibility — only manages document data, not auth or OT.
    """

    @staticmethod
    async def create(db: AsyncSession, title: str, owner: User) -> Document:
        doc = Document(title=title, content="", revision=0, owner_id=owner.id)
        db.add(doc)

        # Owner gets owner permission automatically
        await db.flush()  # get doc.id before commit
        permission = DocumentPermission(
            document_id=doc.id, user_id=owner.id, role=RoleEnum.owner
        )
        db.add(permission)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def get(db: AsyncSession, doc_id: uuid.UUID) -> Document | None:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_documents(db: AsyncSession, user: User) -> list[Document]:
        result = await db.execute(
            select(Document)
            .join(DocumentPermission, DocumentPermission.document_id == Document.id)
            .where(DocumentPermission.user_id == user.id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_content(
        db: AsyncSession, doc: Document, content: str, revision: int
    ):
        doc.content = content
        doc.revision = revision

    @staticmethod
    async def delete(db: AsyncSession, doc: Document):
        await db.delete(doc)
        await db.commit()
