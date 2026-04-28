export type OperationType = "insert" | "delete";

export interface OperationPayload {
  type: OperationType;
  position: number;
  char?: string;
  length?: number;
  revision: number;
  user_id: string;
}

// Simple diffing for controlled <textarea> edits (1 char at a time usually)
export function getOperationFromDiff(
  oldText: string,
  newText: string,
  currentRevision: number,
  userId: string,
): OperationPayload | null {
  if (oldText === newText) return null;

  // Find the first index where they differ
  let start = 0;
  while (
    start < oldText.length &&
    start < newText.length &&
    oldText[start] === newText[start]
  ) {
    start++;
  }

  // If new text is longer, it's an insert
  if (newText.length > oldText.length) {
    // For simplicity, assuming exactly 1 char was inserted (typing) or pasted
    // If pasted, we actually need to send multiple operations but for V1 we just take the first differing char
    // and assume the user types normally
    const insertedChars = newText.slice(
      start,
      start + newText.length - oldText.length,
    );
    // As a simplification we just send the first char if multiple
    return {
      type: "insert",
      position: start,
      char: insertedChars,
      revision: currentRevision,
      user_id: userId,
    };
  }
  // If old text is longer, it's a delete
  else if (oldText.length > newText.length) {
    return {
      type: "delete",
      position: start,
      length: oldText.length - newText.length,
      revision: currentRevision,
      user_id: userId,
    };
  }

  return null;
}

export function applyOperation(content: string, op: any): string {
  if (op.type === "insert" && op.char !== undefined) {
    return content.slice(0, op.position) + op.char + content.slice(op.position);
  } else if (op.type === "delete") {
    const length = op.length || 1;
    return content.slice(0, op.position) + content.slice(op.position + length);
  }
  return content;
}
