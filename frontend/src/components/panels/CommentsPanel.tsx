"use client";

import { EmptyState } from "@/components/ui/EmptyState";

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CommentIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export function CommentsPanel({ isOpen, onClose }: CommentsPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-surface border-l border-border-color shadow-2xl animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border-color shrink-0">
          <h3 className="font-semibold text-foreground">Comments</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CommentIcon />}
            title="Comments coming soon"
            description="Leave feedback and discuss changes directly in the document."
          />
        </div>

        {/* Input mock */}
        <div className="border-t border-border-color p-4">
          <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg border border-border-color opacity-50 cursor-not-allowed">
            <span className="text-sm text-muted">Add a comment…</span>
          </div>
        </div>
      </div>
    </>
  );
}
