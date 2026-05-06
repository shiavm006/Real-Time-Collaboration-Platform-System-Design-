"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";

interface EditorAreaProps {
  content: string;
  onChange: (value: string) => void;
  onCursorMove?: (position: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * The textarea ref is forwarded so the parent (Editor) can manage cursor
 * position directly when remote ops are applied. EditorArea no longer
 * tries to preserve cursor on every external content change — that logic
 * was wrong for collaborative inserts/deletes (it kept the cursor at the
 * *same index* even after content shifted around it). The parent computes
 * the remapped position via `remapCursor` and applies it imperatively.
 */
export const EditorArea = forwardRef<HTMLTextAreaElement, EditorAreaProps>(
  function EditorArea(
    { content, onChange, onCursorMove, disabled = false, placeholder },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        if (onCursorMove) onCursorMove(e.target.selectionStart);
      },
      [onChange, onCursorMove],
    );

    const handleSelect = useCallback(
      (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        if (onCursorMove) {
          onCursorMove((e.target as HTMLTextAreaElement).selectionStart);
        }
      },
      [onCursorMove],
    );

    return (
      <div className="flex-1 flex flex-col items-center overflow-y-auto bg-background">
        <div className="w-full max-w-3xl px-6 py-10 flex-1">
          <textarea
            ref={innerRef}
            value={content}
            onChange={handleChange}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            disabled={disabled}
            placeholder={placeholder || "Start writing..."}
            className="
              editor-area
              w-full h-full min-h-[calc(100vh-220px)]
              bg-transparent resize-none
              text-foreground text-base leading-[1.8]
              placeholder:text-muted/40 placeholder:font-normal
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none
              font-sans
            "
            spellCheck
            autoFocus
          />
        </div>
      </div>
    );
  },
);
