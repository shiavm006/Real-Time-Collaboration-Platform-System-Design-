import pytest

from ot_engine.operation import (
    InsertOperation,
    DeleteOperation,
    OperationFactory,
    OperationType,
)
from ot_engine.transformer import Transformer, NoOpOperation
from ot_engine.document import Document


# ---------- OperationFactory ----------

class TestOperationFactory:
    def test_creates_insert(self):
        op = OperationFactory.create({
            "type": "insert", "position": 0, "char": "a",
            "revision": 0, "user_id": "u1",
        })
        assert isinstance(op, InsertOperation)
        assert op.position == 0 and op.char == "a"
        assert op.get_type() == OperationType.INSERT

    def test_creates_delete(self):
        op = OperationFactory.create({
            "type": "delete", "position": 5,
            "revision": 0, "user_id": "u1",
        })
        assert isinstance(op, DeleteOperation)
        assert op.position == 5
        assert op.get_type() == OperationType.DELETE

    def test_unknown_type_raises(self):
        with pytest.raises(ValueError):
            OperationFactory.create({
                "type": "garbage", "position": 0,
                "revision": 0, "user_id": "u1",
            })


# ---------- apply() ----------

class TestApply:
    def test_insert_at_start(self):
        assert InsertOperation(0, "X", 0, "u1").apply("abc") == "Xabc"

    def test_insert_at_end(self):
        assert InsertOperation(3, "X", 0, "u1").apply("abc") == "abcX"

    def test_insert_in_middle(self):
        assert InsertOperation(1, "X", 0, "u1").apply("abc") == "aXbc"

    def test_delete_at_start(self):
        assert DeleteOperation(0, 0, "u1").apply("abc") == "bc"

    def test_delete_in_middle(self):
        assert DeleteOperation(1, 0, "u1").apply("abc") == "ac"

    def test_delete_out_of_range_is_noop(self):
        assert DeleteOperation(99, 0, "u1").apply("abc") == "abc"


# ---------- Transformer: insert / insert ----------

class TestTransformInsertInsert:
    def test_op1_before_op2_shifts_op2_right(self):
        op1 = InsertOperation(2, "A", 0, "u1")
        op2 = InsertOperation(5, "B", 0, "u2")
        result = Transformer.transform(op1, op2)
        assert isinstance(result, InsertOperation)
        assert result.position == 6 and result.char == "B"

    def test_op1_after_op2_no_shift(self):
        op1 = InsertOperation(7, "A", 0, "u1")
        op2 = InsertOperation(5, "B", 0, "u2")
        assert Transformer.transform(op1, op2).position == 5

    def test_same_position_lower_id_wins_first(self):
        # alice <= bob, alice's op stays at original; bob shifts right
        op1 = InsertOperation(3, "A", 0, "alice")
        op2 = InsertOperation(3, "B", 0, "bob")
        assert Transformer.transform(op1, op2).position == 4

    def test_same_position_higher_id_does_not_shift(self):
        op1 = InsertOperation(3, "A", 0, "bob")
        op2 = InsertOperation(3, "B", 0, "alice")
        # bob > alice → op1.user_id <= op2.user_id is False → op2 unshifted
        assert Transformer.transform(op1, op2).position == 3


# ---------- Transformer: insert / delete ----------

class TestTransformInsertDelete:
    def test_insert_before_delete_shifts_delete_right(self):
        op1 = InsertOperation(2, "X", 0, "u1")
        op2 = DeleteOperation(5, 0, "u2")
        assert Transformer.transform(op1, op2).position == 6

    def test_insert_at_delete_position_shifts_delete_right(self):
        op1 = InsertOperation(5, "X", 0, "u1")
        op2 = DeleteOperation(5, 0, "u2")
        assert Transformer.transform(op1, op2).position == 6

    def test_insert_after_delete_no_shift(self):
        op1 = InsertOperation(7, "X", 0, "u1")
        op2 = DeleteOperation(5, 0, "u2")
        assert Transformer.transform(op1, op2).position == 5


# ---------- Transformer: delete / insert ----------

class TestTransformDeleteInsert:
    def test_delete_before_insert_shifts_insert_left(self):
        op1 = DeleteOperation(2, 0, "u1")
        op2 = InsertOperation(5, "X", 0, "u2")
        result = Transformer.transform(op1, op2)
        assert isinstance(result, InsertOperation)
        assert result.position == 4 and result.char == "X"

    def test_delete_after_insert_no_shift(self):
        op1 = DeleteOperation(7, 0, "u1")
        op2 = InsertOperation(5, "X", 0, "u2")
        assert Transformer.transform(op1, op2).position == 5

    def test_delete_at_insert_no_shift(self):
        op1 = DeleteOperation(5, 0, "u1")
        op2 = InsertOperation(5, "X", 0, "u2")
        assert Transformer.transform(op1, op2).position == 5


# ---------- Transformer: delete / delete ----------

class TestTransformDeleteDelete:
    def test_delete_before_other_shifts_left(self):
        op1 = DeleteOperation(2, 0, "u1")
        op2 = DeleteOperation(5, 0, "u2")
        assert Transformer.transform(op1, op2).position == 4

    def test_delete_after_other_no_shift(self):
        op1 = DeleteOperation(7, 0, "u1")
        op2 = DeleteOperation(5, 0, "u2")
        assert Transformer.transform(op1, op2).position == 5

    def test_same_position_becomes_noop(self):
        op1 = DeleteOperation(3, 0, "u1")
        op2 = DeleteOperation(3, 0, "u2")
        assert isinstance(Transformer.transform(op1, op2), NoOpOperation)


# ---------- Document end-to-end (convergence) ----------

class TestDocumentApplyOperation:
    def test_simple_insert_advances_revision(self):
        doc = Document("d1", "hello", 0)
        doc.apply_operation(InsertOperation(5, "!", 0, "u1"))
        assert doc.content == "hello!"
        assert doc.revision == 1

    def test_concurrent_inserts_at_same_position_converge(self):
        # Two clients both at revision 0, both insert at position 0.
        # OT must produce a single deterministic result.
        doc = Document("d1", "hello", 0)
        doc.apply_operation(InsertOperation(0, "A", 0, "alice"))
        assert doc.content == "Ahello"
        # Bob's op was based on revision 0 (saw "hello"); will be transformed
        # against alice's now-applied op.
        doc.apply_operation(InsertOperation(0, "B", 0, "bob"))
        assert doc.content == "ABhello"
        assert doc.revision == 2

    def test_concurrent_insert_then_delete(self):
        doc = Document("d1", "hello", 0)
        doc.apply_operation(InsertOperation(0, "X", 0, "alice"))
        # Bob deletes at position 2 of original "hello" (the first 'l').
        # After alice's insert, that char is now at position 3 of "Xhello".
        doc.apply_operation(DeleteOperation(2, 0, "bob"))
        assert doc.content == "Xhelo"

    def test_concurrent_deletes_at_same_position_dedup(self):
        doc = Document("d1", "hello", 0)
        doc.apply_operation(DeleteOperation(2, 0, "alice"))
        assert doc.content == "helo"
        # Bob's delete becomes a NoOp — the char alice deleted is gone.
        doc.apply_operation(DeleteOperation(2, 0, "bob"))
        assert doc.content == "helo"
        assert doc.revision == 2  # NoOp still bumps revision (server ack)

    def test_history_recorded_with_server_revision(self):
        doc = Document("d1", "", 0)
        doc.apply_operation(InsertOperation(0, "a", 0, "u1"))
        doc.apply_operation(InsertOperation(1, "b", 1, "u1"))
        history = doc.get_history()
        assert len(history) == 2
        assert history[0]["revision"] == 1
        assert history[1]["revision"] == 2

    def test_stale_revision_replays_against_history(self):
        # Client sends an op tagged with stale revision; server transforms
        # against everything since.
        doc = Document("d1", "abc", 0)
        # Server has already advanced by an insert at position 0
        doc.apply_operation(InsertOperation(0, "X", 0, "alice"))
        assert doc.content == "Xabc"
        # Client (bob) was on revision 0, asks to insert at position 3 ("end of abc")
        doc.apply_operation(InsertOperation(3, "Y", 0, "bob"))
        # Bob's op gets shifted right by 1 → position 4 of "Xabc" (end)
        assert doc.content == "XabcY"


# ---------- Multi-char operations ----------

class TestMultiChar:
    def test_multi_char_insert_apply(self):
        op = InsertOperation(2, "ABC", 0, "u1")
        assert op.apply("xxyyzz") == "xxABCyyzz"

    def test_multi_char_delete_apply(self):
        op = DeleteOperation(2, 0, "u1", length=3)
        assert op.apply("abcdefg") == "abfg"

    def test_factory_parses_length_for_delete(self):
        op = OperationFactory.create({
            "type": "delete", "position": 1, "length": 4,
            "revision": 0, "user_id": "u1",
        })
        assert isinstance(op, DeleteOperation)
        assert op.length == 4

    def test_factory_parses_multi_char_insert(self):
        op = OperationFactory.create({
            "type": "insert", "position": 0, "char": "hello",
            "revision": 0, "user_id": "u1",
        })
        assert isinstance(op, InsertOperation)
        assert op.char == "hello"


# ---------- Transformer: multi-char delete / delete (overlap topology) ----------

class TestTransformDeleteDeleteOverlap:
    def test_op2_entirely_before_op1(self):
        # op1=[10,13), op2=[2,5)
        op1 = DeleteOperation(10, 0, "u1", length=3)
        op2 = DeleteOperation(2, 0, "u2", length=3)
        result = Transformer.transform(op1, op2)
        assert isinstance(result, DeleteOperation)
        assert result.position == 2 and result.length == 3

    def test_op2_entirely_after_op1(self):
        # op1=[2,5), op2=[10,13) → shift left by 3
        op1 = DeleteOperation(2, 0, "u1", length=3)
        op2 = DeleteOperation(10, 0, "u2", length=3)
        result = Transformer.transform(op1, op2)
        assert result.position == 7 and result.length == 3

    def test_op1_fully_contains_op2_becomes_noop(self):
        # op1=[2,8), op2=[3,6) → NoOp
        op1 = DeleteOperation(2, 0, "u1", length=6)
        op2 = DeleteOperation(3, 0, "u2", length=3)
        assert isinstance(Transformer.transform(op1, op2), NoOpOperation)

    def test_op2_fully_contains_op1_shrinks_op2(self):
        # op1=[3,6), op2=[2,9) → op2 keeps the surviving 4 chars at pos 2
        op1 = DeleteOperation(3, 0, "u1", length=3)
        op2 = DeleteOperation(2, 0, "u2", length=7)
        result = Transformer.transform(op1, op2)
        assert isinstance(result, DeleteOperation)
        assert result.position == 2 and result.length == 4

    def test_partial_overlap_op1_first(self):
        # op1=[3,7), op2=[5,11) → surviving [7,11) shifts to [3,7), length 4
        op1 = DeleteOperation(3, 0, "u1", length=4)
        op2 = DeleteOperation(5, 0, "u2", length=6)
        result = Transformer.transform(op1, op2)
        assert result.position == 3 and result.length == 4

    def test_partial_overlap_op2_first(self):
        # op1=[5,11), op2=[3,7) → surviving [3,5), length 2
        op1 = DeleteOperation(5, 0, "u1", length=6)
        op2 = DeleteOperation(3, 0, "u2", length=4)
        result = Transformer.transform(op1, op2)
        assert result.position == 3 and result.length == 2

    def test_same_range_becomes_noop(self):
        op1 = DeleteOperation(3, 0, "u1", length=5)
        op2 = DeleteOperation(3, 0, "u2", length=5)
        assert isinstance(Transformer.transform(op1, op2), NoOpOperation)

    def test_touching_ranges_no_overlap(self):
        # op1=[3,6), op2=[6,9) — adjacent, no overlap, op2 shifts left by 3
        op1 = DeleteOperation(3, 0, "u1", length=3)
        op2 = DeleteOperation(6, 0, "u2", length=3)
        result = Transformer.transform(op1, op2)
        assert result.position == 3 and result.length == 3


class TestTransformInsertDeleteMultiChar:
    def test_insert_inside_delete_range_extends_delete(self):
        # op1 inserts "XX" at 5, op2 deletes [3, 8) length 5
        # Insert is inside op2's range → op2 must absorb the 2 inserted chars
        op1 = InsertOperation(5, "XX", 0, "u1")
        op2 = DeleteOperation(3, 0, "u2", length=5)
        result = Transformer.transform(op1, op2)
        assert isinstance(result, DeleteOperation)
        assert result.position == 3 and result.length == 7  # 5 + 2

    def test_insert_at_delete_start_shifts(self):
        op1 = InsertOperation(3, "XX", 0, "u1")
        op2 = DeleteOperation(3, 0, "u2", length=5)
        result = Transformer.transform(op1, op2)
        # Insert at delete start → delete shifts right by len(insert)
        assert result.position == 5 and result.length == 5

    def test_insert_at_delete_end_no_shift(self):
        op1 = InsertOperation(8, "XX", 0, "u1")
        op2 = DeleteOperation(3, 0, "u2", length=5)
        # Insert at the boundary (end) is treated as "after"
        result = Transformer.transform(op1, op2)
        assert result.position == 3 and result.length == 5


class TestTransformDeleteInsertMultiChar:
    def test_insert_inside_delete_range_clamps(self):
        # op1 deletes [3, 8), op2 inserts at 5 → clamp to op1's start
        op1 = DeleteOperation(3, 0, "u1", length=5)
        op2 = InsertOperation(5, "X", 0, "u2")
        result = Transformer.transform(op1, op2)
        assert isinstance(result, InsertOperation)
        assert result.position == 3

    def test_insert_after_multi_char_delete(self):
        op1 = DeleteOperation(3, 0, "u1", length=5)
        op2 = InsertOperation(10, "X", 0, "u2")
        result = Transformer.transform(op1, op2)
        assert result.position == 5  # 10 - 5
