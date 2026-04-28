from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Version, Document, User
import uuid

SNAPSHOT_EVERY = 10  # take a snapshot every 10 operations


class VersionService:
    """
    Handles document version snapshots.
    """

    @staticmethod
    async def should_snapshot(doc: Document) -> bool:
        return doc.revision % SNAPSHOT_EVERY == 0

    @staticmethod
    async def create_snapshot(db: AsyncSession, doc: Document, user: User):
        version = Version(
            document_id=doc.id,
            created_by=user.id,
            snapshot=doc.content,
            revision=doc.revision,
        )
        db.add(version)

    @staticmethod
    async def get_versions(db: AsyncSession, doc_id: uuid.UUID) -> list[Version]:
        result = await db.execute(
            select(Version)
            .where(Version.document_id == doc_id)
            .order_by(Version.revision.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def restore(db: AsyncSession, doc: Document, version: Version):
        doc.content = version.snapshot
        doc.revision = version.revision
        await db.commit()
