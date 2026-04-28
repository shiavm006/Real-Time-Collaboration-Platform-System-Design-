from ot_engine.operation import Operation, InsertOperation, DeleteOperation, OperationType


# Strategy Pattern — transform algorithm is encapsulated and swappable
class Transformer:
    """
    Core OT algorithm.
    Given two concurrent operations op1 and op2 that were both based
    on the same document revision, transform op2 against op1 so that
    op2 can be applied AFTER op1 and still make sense.
    """

    @staticmethod
    def transform(op1: Operation, op2: Operation) -> Operation:
        """
        Transform op2 against op1.
        Returns a new adjusted op2 that accounts for op1 already being applied.
        """
        if isinstance(op1, InsertOperation) and isinstance(op2, InsertOperation):
            return Transformer._transform_insert_insert(op1, op2)

        elif isinstance(op1, InsertOperation) and isinstance(op2, DeleteOperation):
            return Transformer._transform_insert_delete(op1, op2)

        elif isinstance(op1, DeleteOperation) and isinstance(op2, InsertOperation):
            return Transformer._transform_delete_insert(op1, op2)

        elif isinstance(op1, DeleteOperation) and isinstance(op2, DeleteOperation):
            return Transformer._transform_delete_delete(op1, op2)

        raise ValueError("Unknown operation type combination")

    @staticmethod
    def _transform_insert_insert(op1: InsertOperation, op2: InsertOperation) -> InsertOperation:
        """
        Both users inserted at the same time.

        Case 1: op1 inserted BEFORE op2's position
                → op2's position shifts right by 1

        Case 2: op1 inserted AFTER op2's position
                → op2's position stays the same

        Case 3: op1 and op2 inserted at SAME position
                → tie-break by user_id to keep consistency across all clients
        """
        if op1.position < op2.position:
            # op1 pushed everything right, so op2 must move right too
            return InsertOperation(op2.position + len(op1.char), op2.char, op2.revision, op2.user_id)

        elif op1.position > op2.position:
            # op1 is to the right, op2 position unaffected
            return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)

        else:
            # Same position — use user_id as tie-breaker for determinism
            if op1.user_id <= op2.user_id:
                return InsertOperation(op2.position + len(op1.char), op2.char, op2.revision, op2.user_id)
            else:
                return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)

    @staticmethod
    def _transform_insert_delete(op1: InsertOperation, op2: DeleteOperation) -> DeleteOperation:
        """
        op1 inserted, op2 deleted at the same time.

        Case 1: op1 inserted BEFORE op2's delete position
                → op2's position shifts right by 1

        Case 2: op1 inserted AFTER or AT op2's delete position
                → op2's position stays the same
        """
        if op1.position <= op2.position:
            return DeleteOperation(op2.position + len(op1.char), op2.revision, op2.user_id)
        else:
            return DeleteOperation(op2.position, op2.revision, op2.user_id)

    @staticmethod
    def _transform_delete_insert(op1: DeleteOperation, op2: InsertOperation) -> InsertOperation:
        """
        op1 deleted, op2 inserted at the same time.

        Case 1: op1 deleted BEFORE op2's insert position
                → op2's position shifts left by 1

        Case 2: op1 deleted AFTER op2's insert position
                → op2's position stays the same
        """
        if op1.position < op2.position:
            return InsertOperation(op2.position - op1.length, op2.char, op2.revision, op2.user_id)
        else:
            return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)

    @staticmethod
    def _transform_delete_delete(op1: DeleteOperation, op2: DeleteOperation) -> Operation:
        """
        Both users deleted at the same time.

        Case 1: op1 deleted BEFORE op2's position
                → op2's position shifts left by 1

        Case 2: op1 deleted AFTER op2's position
                → op2's position stays the same

        Case 3: SAME position — both deleted the same character
                → op2 becomes a no-op (nothing left to delete)
        """
        if op1.position < op2.position:
            return DeleteOperation(op2.position - op1.length, op2.revision, op2.user_id, op2.length)

        elif op1.position > op2.position:
            return DeleteOperation(op2.position, op2.revision, op2.user_id, op2.length)

        else:
            # Same character deleted by both — return no-op delete at safe position
            return NoOpOperation(op2.revision, op2.user_id)


# No-op operation — returned when a conflict resolves to "nothing to do"
class NoOpOperation(Operation):
    def __init__(self, revision: int, user_id: str):
        super().__init__(position=0, revision=revision, user_id=user_id)

    def apply(self, content: str) -> str:
        return content  # does nothing

    def get_type(self) -> OperationType:
        return OperationType.DELETE  # treated as delete for protocol purposes

    def to_dict(self) -> dict:
        return {
            "type": "noop",
            "position": -1,
            "revision": self.revision,
            "user_id": self.user_id
        }