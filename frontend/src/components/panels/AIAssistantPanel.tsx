"use client";

import { EmptyState } from "@/components/ui/EmptyState";

interface AIAssistantPanelProps {
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

const SparkleIcon = () => (
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
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-surface border-l border-border-color shadow-2xl animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border-color shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground">AI Assistant</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<SparkleIcon />}
            title="AI features coming soon"
            description="Get writing suggestions, summaries, and intelligent editing assistance."
          />
        </div>

        {/* Input mock */}
        <div className="border-t border-border-color p-4">
          <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg border border-border-color opacity-50 cursor-not-allowed">
            <span className="text-sm text-muted">Ask AI anything…</span>
          </div>
        </div>
      </div>
    </>
  );
}
