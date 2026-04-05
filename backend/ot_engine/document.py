from ot_engine.operation import Operation, InsertOperation, DeleteOperation
from ot_engine.transformer import Transformer, NoOpOperation


class Document:
    """
    Represents the server-side document state.
    Holds current content, current revision, and operation history.
    Responsible for applying and transforming incoming operations.

    OOP: Encapsulation — all document state is managed here, nothing leaks out.
    """

    def __init__(self, doc_id: str, content: str = "", revision: int = 0):
        self.doc_id = doc_id
        self.content = content
        self.revision = revision
        self._history: list[Operation] = []  # all operations applied so far

    def apply_operation(self, operation: Operation) -> Operation:
        """
        Core method — takes an incoming operation from a client,
        transforms it against any operations the client hasn't seen yet,
        applies it to the document, and returns the transformed operation
        to broadcast to other clients.
        """
        # Transform incoming op against all ops the client missed
        transformed_op = self._transform_against_history(operation)

        # Apply to document content
        if not isinstance(transformed_op, NoOpOperation):
            self.content = transformed_op.apply(self.content)

        # Update revision and record in history
        self.revision += 1
        transformed_op.revision = self.revision
        self._history.append(transformed_op)

        return transformed_op

    def _transform_against_history(self, operation: Operation) -> Operation:
        """
        The client sent an operation based on revision N.
        Server is now at revision M (M >= N).
        We need to transform the operation against all ops from N to M.
        """
        # Find all ops the client hasn't seen yet
        concurrent_ops = self._history[operation.revision:]

        transformed = operation
        for historical_op in concurrent_ops:
            transformed = Transformer.transform(historical_op, transformed)

        return transformed

    def get_snapshot(self) -> dict:
        """Returns current document state — used for version snapshots."""
        return {
            "doc_id": self.doc_id,
            "content": self.content,
            "revision": self.revision
        }

    def get_history(self) -> list[dict]:
        """Returns full operation history as list of dicts."""
        return [op.to_dict() for op in self._history]