"use client";

import { Tooltip } from "@/components/ui/Tooltip";

const tools = [
  {
    group: "text",
    items: [
      { icon: "B", label: "Bold", style: "font-bold" },
      { icon: "I", label: "Italic", style: "italic" },
      { icon: "U", label: "Underline", style: "underline" },
      { icon: "S", label: "Strikethrough", style: "line-through" },
    ],
  },
  {
    group: "block",
    items: [
      {
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        ),
        label: "Heading",
      },
      {
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        ),
        label: "Bullet list",
      },
      {
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        ),
        label: "Numbered list",
      },
    ],
  },
  {
    group: "insert",
    items: [
      {
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ),
        label: "Code block",
      },
      {
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        ),
        label: "Divider",
      },
    ],
  },
];

export function EditorToolbar() {
  return (
    <div className="border-b border-border-color bg-surface">
      <div className="flex items-center gap-0.5 px-4 py-1.5 max-w-4xl mx-auto overflow-x-auto">
        {tools.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && (
              <div className="w-px h-5 bg-border-color mx-1.5 shrink-0" />
            )}
            <div className="flex items-center gap-0.5">
              {group.items.map((tool, ti) => (
                <Tooltip key={ti} text={`${tool.label} (coming soon)`}>
                  <button
                    disabled
                    className={`
                      p-1.5 rounded-md text-muted
                      hover:bg-surface-hover hover:text-foreground
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-colors duration-100
                      min-w-[28px] min-h-[28px]
                      flex items-center justify-center
                      text-sm
                      ${"style" in tool ? tool.style : ""}
                    `}
                  >
                    {typeof tool.icon === "string" ? (
                      <span className="text-[13px] leading-none">
                        {tool.icon}
                      </span>
                    ) : (
                      tool.icon
                    )}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
