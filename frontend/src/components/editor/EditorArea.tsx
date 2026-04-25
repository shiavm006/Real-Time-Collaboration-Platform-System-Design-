"use client";

import { useRef, useCallback } from "react";

interface EditorAreaProps {
  content: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EditorArea({ content, onChange, disabled = false, placeholder }: EditorAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto bg-background">
      <div className="w-full max-w-3xl px-6 py-10 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
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
