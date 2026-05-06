from ot_engine.operation import (
    Operation,
    InsertOperation,
    DeleteOperation,
    OperationType,
)


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
    def _transform_insert_insert(
        op1: InsertOperation, op2: InsertOperation
    ) -> InsertOperation:
        """
        Both users inserted concurrently.

        - op1 strictly before op2: shift op2 right by len(op1.char).
        - op1 strictly after op2:  no shift.
        - Same position:           tie-break by user_id (lower id "wins"
                                   the earlier slot; loser shifts right).
        """
        if op1.position < op2.position:
            return InsertOperation(
                op2.position + len(op1.char), op2.char, op2.revision, op2.user_id
            )

        if op1.position > op2.position:
            return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)

        # Same position — deterministic tie-break
        if op1.user_id <= op2.user_id:
            return InsertOperation(
                op2.position + len(op1.char), op2.char, op2.revision, op2.user_id
            )
        return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)

    @staticmethod
    def _transform_insert_delete(
        op1: InsertOperation, op2: DeleteOperation
    ) -> DeleteOperation:
        """
        op1 inserted concurrently with op2 deleting.

        - Insert at or before delete start: shift delete right by len(op1.char).
        - Insert strictly inside delete range: extend delete length to absorb
          the inserted text (so the user's deletion still removes the original
          characters, plus the newly-inserted text wedged in).
        - Insert at or after delete end: no shift.
        """
        delete_end = op2.position + op2.length
        if op1.position <= op2.position:
            return DeleteOperation(
                op2.position + len(op1.char),
                op2.revision,
                op2.user_id,
                op2.length,
            )
        if op1.position < delete_end:
            # Insert lands inside op2's delete range — absorb the inserted chars.
            return DeleteOperation(
                op2.position,
                op2.revision,
                op2.user_id,
                op2.length + len(op1.char),
            )
        return DeleteOperation(op2.position, op2.revision, op2.user_id, op2.length)

    @staticmethod
    def _transform_delete_insert(
        op1: DeleteOperation, op2: InsertOperation
    ) -> InsertOperation:
        """
        op1 deleted concurrently with op2 inserting.

        - Insert at or before delete start: no shift.
        - Insert at or after delete end:    shift left by op1.length.
        - Insert strictly inside delete range: clamp to op1's start
          (the original surrounding chars are gone; insert lands where they used to be).
        """
        delete_end = op1.position + op1.length
        if op2.position <= op1.position:
            return InsertOperation(op2.position, op2.char, op2.revision, op2.user_id)
        if op2.position >= delete_end:
            return InsertOperation(
                op2.position - op1.length, op2.char, op2.revision, op2.user_id
            )
        # Insert was inside the deleted range — clamp to where the range used to start
        return InsertOperation(op1.position, op2.char, op2.revision, op2.user_id)

    @staticmethod
    def _transform_delete_delete(
        op1: DeleteOperation, op2: DeleteOperation
    ) -> Operation:
        """
        Two concurrent deletes. Six topological cases.

        Notation: op1 = [a, a+m), op2 = [b, b+n).
        """
        a, m = op1.position, op1.length
        b, n = op2.position, op2.length
        a_end = a + m
        b_end = b + n

        # 1. op2 entirely before op1 → no change
        if b_end <= a:
            return DeleteOperation(b, op2.revision, op2.user_id, n)

        # 2. op2 entirely after op1 → shift left by op1.length
        if b >= a_end:
            return DeleteOperation(b - m, op2.revision, op2.user_id, n)

        # 3. op1 fully contains op2 → op2 has nothing left to delete (NoOp)
        if a <= b and a_end >= b_end:
            return NoOpOperation(op2.revision, op2.user_id)

        # 4. op2 fully contains op1 → op2 keeps the bytes outside op1
        if b <= a and b_end >= a_end:
            new_length = n - m
            if new_length <= 0:
                return NoOpOperation(op2.revision, op2.user_id)
            # b is at or before a, so b's position is unaffected by op1's left-shift
            return DeleteOperation(b, op2.revision, op2.user_id, new_length)

        # 5. Partial overlap, op1 starts first (a < b < a_end < b_end)
        if a < b and b < a_end and a_end < b_end:
            # Surviving range: [a_end, b_end), shifted left by m → [a, b_end - m)
            return DeleteOperation(a, op2.revision, op2.user_id, b_end - a_end)

        # 6. Partial overlap, op2 starts first (b < a < b_end < a_end)
        if b < a and a < b_end and b_end < a_end:
            # Surviving range: [b, a) — entirely before op1, unaffected by shift
            return DeleteOperation(b, op2.revision, op2.user_id, a - b)

        # Defensive fallthrough — shouldn't be reachable.
        return DeleteOperation(b, op2.revision, op2.user_id, n)


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
            "user_id": self.user_id,
        }
