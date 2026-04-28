"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { type ConnectionState } from "@/lib/websocket";

interface EditorNavbarProps {
  title: string;
  onTitleChange?: (title: string) => void;
  connectionState: ConnectionState;
  isSaving: boolean;
  onlineUsers: string[];
  typingUsers: string[];
  onOpenVersionHistory: () => void;
  onOpenShare: () => void;
  onOpenComments: () => void;
  onOpenAI: () => void;
  onDelete?: () => void;
}

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const MoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function ConnectionBadge({ state, isSaving }: { state: ConnectionState; isSaving: boolean }) {
  if (isSaving) {
    return <Badge variant="primary" dot pulse>Saving…</Badge>;
  }
  switch (state) {
    case "connected":
      return <Badge variant="success" dot>Saved</Badge>;
    case "connecting":
      return <Badge variant="warning" dot pulse>Connecting…</Badge>;
    case "reconnecting":
      return <Badge variant="warning" dot pulse>Reconnecting…</Badge>;
    case "disconnected":
      return <Badge variant="danger" dot>Offline</Badge>;
  }
}

function PresenceAvatars({ userIds, typingUsers }: { userIds: string[], typingUsers: string[] }) {
  const visible = userIds.slice(0, 4);
  const overflow = userIds.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visible.map((uid, i) => {
          const isTyping = typingUsers.includes(uid);
          return (
            <Tooltip key={uid} text={`User ${uid.slice(0, 6)} ${isTyping ? "(typing...)" : ""}`}>
              <div className={`relative rounded-full transition-transform hover:scale-110 hover:z-10 ${isTyping ? "ring-2 ring-brand-500 ring-offset-1 ring-offset-surface" : ""}`}>
                <Avatar
                  name={uid.slice(0, 6)}
                  userId={uid}
                  size="sm"
                />
              </div>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <div className="w-6 h-6 rounded-full bg-surface-hover border-2 border-surface flex items-center justify-center text-[10px] font-semibold text-muted">
            +{overflow}
          </div>
        )}
      </div>
      {userIds.length > 0 && (
        <span className="text-xs text-muted hidden sm:inline">
          {userIds.length} online
        </span>
      )}
    </div>
  );
}

export function EditorNavbar({
  title,
  onTitleChange,
  connectionState,
  isSaving,
  onlineUsers,
  typingUsers,
  onOpenVersionHistory,
  onOpenShare,
  onOpenComments,
  onOpenAI,
  onDelete,
}: EditorNavbarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() && editedTitle !== title && onTitleChange) {
      onTitleChange(editedTitle.trim());
    } else {
      setEditedTitle(title);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border-color">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Tooltip text="Back to Dashboard">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeftIcon />
            </Link>
          </Tooltip>

          <div className="h-5 w-px bg-border-color shrink-0" />

          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setEditedTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              className="text-base font-semibold text-foreground bg-transparent border-b-[1.5px] border-foreground outline-none py-0.5 min-w-0 max-w-xs"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-base font-semibold text-foreground hover:text-brand-600 truncate transition-colors max-w-xs"
              title="Click to rename"
            >
              {title}
            </button>
          )}

          <ConnectionBadge state={connectionState} isSaving={isSaving} />
        </div>

        {/* Right: Presence + Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <PresenceAvatars userIds={onlineUsers} typingUsers={typingUsers} />

          <div className="h-5 w-px bg-border-color hidden sm:block" />

          <div className="hidden sm:flex items-center gap-1">
            <Tooltip text="Comments">
              <button
                onClick={onOpenComments}
                className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
              >
                <CommentIcon />
              </button>
            </Tooltip>
            <Tooltip text="AI Assistant">
              <button
                onClick={onOpenAI}
                className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
              >
                <SparkleIcon />
              </button>
            </Tooltip>
          </div>

          <button
            onClick={onOpenShare}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-foreground hover:bg-brand-800 text-background rounded-lg transition-colors active:scale-[0.97]"
          >
            <ShareIcon />
            Share
          </button>

          <DropdownMenu
            trigger={
              <button className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors">
                <MoreIcon />
              </button>
            }
            items={[
              { label: "Version history", icon: <HistoryIcon />, onClick: onOpenVersionHistory },
              { label: "Share", icon: <ShareIcon />, onClick: onOpenShare },
              { label: "Comments", icon: <CommentIcon />, onClick: onOpenComments },
              { label: "AI Assistant", icon: <SparkleIcon />, onClick: onOpenAI },
              { label: "Export as text", icon: <DownloadIcon />, onClick: () => {} },
              ...(onDelete ? [{ label: "Delete document", icon: <TrashIcon />, onClick: onDelete, variant: "danger" as const }] : []),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
