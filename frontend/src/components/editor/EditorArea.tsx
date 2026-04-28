"use client";

import { useRef, useCallback, useEffect } from "react";

interface EditorAreaProps {
  content: string;
  onChange: (value: string) => void;
  onCursorMove?: (position: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EditorArea({
  content,
  onChange,
  onCursorMove,
  disabled = false,
  placeholder,
}: EditorAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastContentRef = useRef(content);

  // Preserve cursor position on external updates
  useEffect(() => {
    if (textareaRef.current && content !== lastContentRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      lastContentRef.current = content;

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start, end);
      });
    }
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      lastContentRef.current = e.target.value;
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
          ref={textareaRef}
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
}
