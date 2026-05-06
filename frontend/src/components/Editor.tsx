"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { documentService } from "@/lib/documentService";
import { CollabWebSocket, type ConnectionState } from "@/lib/websocket";
import {
  applyOperation,
  getOperationsFromDiff,
  remapCursor,
  type RemoteOperation,
} from "@/lib/ot";
import { EditorNavbar } from "@/components/editor/EditorNavbar";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorArea } from "@/components/editor/EditorArea";
import { SkeletonEditor } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

// Panels are not on the critical path — defer their JS until first open.
// `ssr: false` keeps them out of the server bundle entirely.
const VersionHistoryPanel = dynamic(
  () =>
    import("@/components/panels/VersionHistoryPanel").then(
      (m) => m.VersionHistoryPanel,
    ),
  { ssr: false },
);
const SharePanel = dynamic(
  () => import("@/components/panels/SharePanel").then((m) => m.SharePanel),
  { ssr: false },
);
const CommentsPanel = dynamic(
  () =>
    import("@/components/panels/CommentsPanel").then((m) => m.CommentsPanel),
  { ssr: false },
);
const AIAssistantPanel = dynamic(
  () =>
    import("@/components/panels/AIAssistantPanel").then(
      (m) => m.AIAssistantPanel,
    ),
  { ssr: false },
);

const CURSOR_THROTTLE_MS = 200; // max 5 cursor messages/sec, regardless of typing speed
const TYPING_INDICATOR_MS = 2000;

export function Editor({ documentId }: { documentId: string }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Loading...");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [docLoading, setDocLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Panel states
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const wsRef = useRef<CollabWebSocket | null>(null);
  const contentRef = useRef("");
  const revisionRef = useRef(0);
  const userRef = useRef(user);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initReceivedRef = useRef(false);

  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cursor send throttle: leading + trailing edge over CURSOR_THROTTLE_MS.
  const cursorLastSentAtRef = useRef(0);
  const cursorTrailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cursorPendingPosRef = useRef(0);

  // One typing timer per user — reset, don't stack.
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setDocLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    initReceivedRef.current = false;
    setAccessDenied(false);

    const ws = new CollabWebSocket(documentId, token);

    ws.onStateChange((state) => {
      setConnectionState(state);
      // If we never received init and the WS goes to disconnected (out of
      // retries), assume access denied / doc missing.
      if (state === "disconnected" && !initReceivedRef.current) {
        setDocLoading(false);
        setAccessDenied(true);
      }
    });

    ws.on("message", (msg: any) => {
      // Server snapshot — initial connect, reconnect, or version restore
      if (msg.type === "init") {
        const next: string = msg.content ?? "";
        const nextRev: number = msg.revision ?? 0;
        contentRef.current = next;
        revisionRef.current = nextRev;
        setContent(next);
        setRevision(nextRev);
        if (typeof msg.title === "string" && msg.title) setTitle(msg.title);
        if (!initReceivedRef.current) {
          initReceivedRef.current = true;
          setDocLoading(false);
        }
        const ta = textareaRef.current;
        if (ta) {
          const clamp = Math.min(ta.selectionStart, next.length);
          pendingSelectionRef.current = { start: clamp, end: clamp };
        }
        return;
      }

      if (msg.type === "ack") {
        if (typeof msg.revision === "number") {
          revisionRef.current = msg.revision;
          setRevision(msg.revision);
        }
        return;
      }

      if (msg.type === "operation") {
        const op = msg.operation as RemoteOperation;
        const me = userRef.current;
        if (me && msg.user_id === me.id) return;

        const ta = textareaRef.current;
        if (ta) {
          pendingSelectionRef.current = remapCursor(
            ta.selectionStart,
            ta.selectionEnd,
            op,
          );
        }

        const newContent = applyOperation(contentRef.current, op);
        contentRef.current = newContent;
        revisionRef.current = op.revision;
        setContent(newContent);
        setRevision(op.revision);
        return;
      }

      if (msg.type === "presence") {
        const list: string[] = Array.isArray(msg.online_users)
          ? msg.online_users
          : [];
        setOnlineUsers(Array.from(new Set(list)));
        return;
      }

      if (msg.type === "cursor") {
        const me = userRef.current;
        if (me && msg.user_id === me.id) return;

        const uid = msg.user_id as string;
        setTypingUsers((prev) => (prev.includes(uid) ? prev : [...prev, uid]));

        // Reset (don't stack) the per-user timeout so we don't leak timers
        // and avoid 50 setStates 2 seconds after a typing burst.
        const existing = typingTimersRef.current.get(uid);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== uid));
          typingTimersRef.current.delete(uid);
        }, TYPING_INDICATOR_MS);
        typingTimersRef.current.set(uid, timer);
        return;
      }

      if (msg.type === "kicked") {
        const reason: string = msg.reason || "permission_revoked";
        try {
          wsRef.current?.disconnect();
        } catch {}
        const message =
          reason === "permission_revoked"
            ? "Your access to this document was removed by the owner."
            : "You've been disconnected from this document.";
        if (typeof window !== "undefined") alert(message);
        router.push("/");
        return;
      }

      if (msg.type === "error") {
        console.error("WS error:", msg.message);
      }
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      if (cursorTrailingTimerRef.current) {
        clearTimeout(cursorTrailingTimerRef.current);
        cursorTrailingTimerRef.current = null;
      }
      typingTimersRef.current.forEach((t) => clearTimeout(t));
      typingTimersRef.current.clear();
      ws.disconnect();
    };
  }, [documentId, user, isAuthenticated, authLoading, router]);

  useLayoutEffect(() => {
    const target = pendingSelectionRef.current;
    if (!target) return;
    pendingSelectionRef.current = null;
    const ta = textareaRef.current;
    if (!ta) return;
    const len = ta.value.length;
    const start = Math.min(Math.max(target.start, 0), len);
    const end = Math.min(Math.max(target.end, 0), len);
    ta.setSelectionRange(start, end);
  });

  const handleContentChange = useCallback((newText: string) => {
    const me = userRef.current;
    const ws = wsRef.current;
    if (!me) return;

    const oldText = contentRef.current;
    if (oldText === newText) return;

    const ops = getOperationsFromDiff(
      oldText,
      newText,
      revisionRef.current,
      me.id,
    );

    contentRef.current = newText;
    setContent(newText);

    if (ops.length === 0 || !ws) return;

    setSaving(true);
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    savingTimerRef.current = setTimeout(() => setSaving(false), 600);

    for (const op of ops) {
      ws.send({ type: "operation", operation: op });
      revisionRef.current += 1;
    }
    setRevision(revisionRef.current);
  }, []);

  // Throttled cursor send: at most one message per CURSOR_THROTTLE_MS,
  // with a trailing send so the final position isn't lost.
  const handleCursorMove = useCallback(
    (position: number) => {
      if (!wsRef.current || !isAuthenticated) return;
      cursorPendingPosRef.current = position;

      const now = Date.now();
      const elapsed = now - cursorLastSentAtRef.current;

      if (elapsed >= CURSOR_THROTTLE_MS) {
        wsRef.current.send({ type: "cursor", position });
        cursorLastSentAtRef.current = now;
        return;
      }

      if (cursorTrailingTimerRef.current) return;
      const wait = CURSOR_THROTTLE_MS - elapsed;
      cursorTrailingTimerRef.current = setTimeout(() => {
        cursorTrailingTimerRef.current = null;
        if (wsRef.current && isAuthenticated) {
          wsRef.current.send({
            type: "cursor",
            position: cursorPendingPosRef.current,
          });
          cursorLastSentAtRef.current = Date.now();
        }
      }, wait);
    },
    [isAuthenticated],
  );

  const handleDelete = async () => {
    try {
      await documentService.deleteDocument(documentId);
      router.push("/");
    } catch {
      console.error("Failed to delete");
    }
  };

  if (authLoading || docLoading) {
    return (
      <div className="flex-1 flex flex-col bg-background animate-fade-in">
        <div className="h-14 border-b border-border-color bg-surface" />
        <div className="border-b border-border-color bg-surface h-10" />
        <SkeletonEditor />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted mb-2">
            Please sign in to view this document.
          </p>
          <Button variant="primary" onClick={() => router.push("/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground font-medium mb-1">
            Can&apos;t open this document
          </p>
          <p className="text-muted text-sm mb-4">
            It may have been deleted, or you don&apos;t have access.
          </p>
          <Button variant="primary" onClick={() => router.push("/")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      <EditorNavbar
        title={title}
        connectionState={connectionState}
        isSaving={saving}
        onlineUsers={onlineUsers}
        typingUsers={typingUsers}
        onOpenVersionHistory={() => setShowVersionHistory(true)}
        onOpenShare={() => setShowShare(true)}
        onOpenComments={() => setShowComments(true)}
        onOpenAI={() => setShowAI(true)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <EditorToolbar />

      <EditorArea
        ref={textareaRef}
        content={content}
        onChange={handleContentChange}
        onCursorMove={handleCursorMove}
        disabled={!isAuthenticated}
        placeholder="Start writing your collaborative document here..."
      />

      {/* Panels — chunks load on first open */}
      {showVersionHistory && (
        <VersionHistoryPanel
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          documentId={documentId}
        />
      )}
      {showShare && (
        <SharePanel
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          documentId={documentId}
        />
      )}
      {showComments && (
        <CommentsPanel
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}
      {showAI && (
        <AIAssistantPanel isOpen={showAI} onClose={() => setShowAI(false)} />
      )}

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Document"
        description={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
