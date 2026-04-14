from sqlalchemy.ext.asyncio import AsyncSession
from db.models import OperationLog, User
from services.document_service import DocumentService
from services.version_service import VersionService
from ot_engine.document import Document
from ot_engine.operation import OperationFactory
import uuid

class OTService:
    """
    Facade Pattern & SRP Consolidation
    ---------------------------------
    This service acts as a Facade to completely abstract the interactions 
    between the Database Layer and the Operational Transformation (OT) Engine.
    By doing so, we prevent the WebSocket Router from violating the Single 
    Responsibility Principle (SRP).
    """
    
    @staticmethod
    async def process_operation(
        db: AsyncSession, 
        doc_uuid: uuid.UUID, 
        in_memory_doc: Document, 
        user: User, 
        raw_operation_data: dict
    ) -> dict:
        """
        Accepts raw payload data and coordinates the OT engine and database persistence.
        """
        # SOLID: High level logic abstracts factory usage.
        op_data = {**raw_operation_data, "user_id": str(user.id)}
        operation = OperationFactory.create(op_data)

        # Apply OT — transform and apply
        transformed_op = in_memory_doc.apply_operation(operation)

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
        if db_doc:
            await DocumentService.update_content(db, db_doc, in_memory_doc.content, in_memory_doc.revision)

            # Snapshot if needed
            if await VersionService.should_snapshot(db_doc):
                await VersionService.create_snapshot(db, db_doc, user)

        await db.commit()
        
        # Return the transformed dict so the router can broadcast it
        return transformed_op.to_dict()
