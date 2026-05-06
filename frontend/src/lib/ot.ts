export type OperationType = "insert" | "delete";

export interface InsertPayload {
  type: "insert";
  position: number;
  char: string;
  length?: never;
  revision: number;
  user_id: string;
  client_op_id?: string;
}

export interface DeletePayload {
  type: "delete";
  position: number;
  length: number;
  char?: never;
  revision: number;
  user_id: string;
  client_op_id?: string;
}

export type OperationPayload = InsertPayload | DeletePayload;

/** A remote (already-transformed) op the server may broadcast. */
export interface RemoteOperation {
  type: "insert" | "delete" | "noop";
  position: number;
  char?: string;
  length?: number;
  revision: number;
  user_id: string;
}

/**
 * Compute the minimal sequence of ops that turns `oldText` into `newText`.
 *
 * Uses common-prefix + common-suffix to detect the changed window, then emits
 * a delete (if any chars were removed) followed by an insert (if any chars
 * were added). This correctly handles inserts, deletes, AND replaces — the
 * earlier single-op implementation silently dropped same-length replaces and
 * mishandled selection-replacements.
 *
 * Each op is tagged with a sequential revision so the server processes them
 * in order on the same WebSocket.
 */
export function getOperationsFromDiff(
  oldText: string,
  newText: string,
  startRevision: number,
  userId: string,
): OperationPayload[] {
  if (oldText === newText) return [];

  // Longest common prefix
  let prefix = 0;
  const cap = Math.min(oldText.length, newText.length);
  while (prefix < cap && oldText[prefix] === newText[prefix]) prefix++;

  // Longest common suffix that does not overlap the prefix
  let suffix = 0;
  while (
    suffix < oldText.length - prefix &&
    suffix < newText.length - prefix &&
    oldText[oldText.length - 1 - suffix] ===
      newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const removed = oldText.slice(prefix, oldText.length - suffix);
  const inserted = newText.slice(prefix, newText.length - suffix);

  const ops: OperationPayload[] = [];
  let rev = startRevision;

  if (removed.length > 0) {
    ops.push({
      type: "delete",
      position: prefix,
      length: removed.length,
      revision: rev,
      user_id: userId,
    });
    rev += 1;
  }
  if (inserted.length > 0) {
    ops.push({
      type: "insert",
      position: prefix,
      char: inserted,
      revision: rev,
      user_id: userId,
    });
    rev += 1;
  }

  return ops;
}

/**
 * @deprecated Use `getOperationsFromDiff` — this returns only one op and
 * silently drops the other side of a replace. Kept for any callers that
 * haven't migrated yet.
 */
export function getOperationFromDiff(
  oldText: string,
  newText: string,
  currentRevision: number,
  userId: string,
): OperationPayload | null {
  const ops = getOperationsFromDiff(oldText, newText, currentRevision, userId);
  return ops[0] ?? null;
}

/** Apply a server-broadcast op to local content. NoOps and unknown types are ignored. */
export function applyOperation(
  content: string,
  op: RemoteOperation | { type: string; [k: string]: unknown },
): string {
  if (op.type === "noop") return content;
  if (op.type === "insert" && typeof (op as RemoteOperation).char === "string") {
    const o = op as RemoteOperation;
    return content.slice(0, o.position) + (o.char ?? "") + content.slice(o.position);
  }
  if (op.type === "delete") {
    const o = op as RemoteOperation;
    const len = o.length ?? 1;
    return content.slice(0, o.position) + content.slice(o.position + len);
  }
  return content;
}

/**
 * Remap a textarea selection [start, end] after a remote op was applied.
 * Cursor inside a deleted range collapses to the delete's start position.
 */
export function remapCursor(
  start: number,
  end: number,
  op: RemoteOperation,
): { start: number; end: number } {
  if (op.type === "noop") return { start, end };

  if (op.type === "insert" && typeof op.char === "string") {
    const len = op.char.length;
    return {
      start: op.position <= start ? start + len : start,
      end: op.position <= end ? end + len : end,
    };
  }

  if (op.type === "delete") {
    const dLen = op.length ?? 1;
    const dEnd = op.position + dLen;
    const remap = (pos: number) => {
      if (pos <= op.position) return pos; // before delete — unchanged
      if (pos >= dEnd) return pos - dLen; // after delete — shift left
      return op.position; // inside delete — clamp to start
    };
    return { start: remap(start), end: remap(end) };
  }

  return { start, end };
}
