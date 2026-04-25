"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`
            absolute top-full mt-1 z-50
            ${align === "right" ? "right-0" : "left-0"}
            min-w-[180px]
            bg-surface border border-border-color
            rounded-lg shadow-xl shadow-neutral-950/10
            py-1 animate-scale-in origin-top-right
          `}
        >
          {items.map((item, i) => (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                transition-colors duration-100
                disabled:opacity-40 disabled:pointer-events-none
                ${item.variant === "danger"
                  ? "text-danger hover:bg-danger/10"
                  : "text-foreground hover:bg-surface-hover"
                }
              `}
            >
              {item.icon && <span className="w-4 h-4 shrink-0 opacity-60">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
