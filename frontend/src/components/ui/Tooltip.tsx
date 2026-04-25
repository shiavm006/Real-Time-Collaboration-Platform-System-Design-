"use client";

import { type ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({ text, children, position = "top" }: TooltipProps) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"}
          px-2.5 py-1 rounded-md
          bg-neutral-900 dark:bg-neutral-100
          text-white dark:text-neutral-900
          text-xs font-medium whitespace-nowrap
          opacity-0 scale-95 pointer-events-none
          group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
          transition-all duration-150 ease-out
          z-50
        `}
      >
        {text}
      </div>
    </div>
  );
}
