"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
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
import { VersionHistoryPanel } from "@/components/panels/VersionHistoryPanel";
import { SharePanel } from "@/components/panels/SharePanel";
import { CommentsPanel } from "@/components/panels/CommentsPanel";
import { AIAssistantPanel } from "@/components/panels/AIAssistantPanel";
import { SkeletonEditor } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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

  // Panel states
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const wsRef = useRef<CollabWebSocket | null>(null);
  const contentRef = useRef(content);
  const revisionRef = useRef(revision);
  const userRef = useRef(user);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Selection [start, end] to apply on the next render. Set when remote ops
  // arrive (so we can remap the cursor) or when init replaces content (so
  // we can clamp the cursor inside the new content length).
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror state into refs so handlers always see fresh values
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setDocLoading(false);
      return;
    }

    let ws: CollabWebSocket | null = null;
    let cancelled = false;

    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const doc = await documentService.getDocument(documentId);
        if (cancelled) return;
        setContent(doc.content || "");
        setTitle(doc.title);
        setRevision(doc.revision || 0);
        contentRef.current = doc.content || "";
        revisionRef.current = doc.revision || 0;
        setDocLoading(false);

        ws = new CollabWebSocket(documentId, token);

        ws.onStateChange((state) => {
          setConnectionState(state);
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
            const ta = textareaRef.current;
            if (ta) {
              const clamp = Math.min(ta.selectionStart, next.length);
              pendingSelectionRef.current = { start: clamp, end: clamp };
            }
            return;
          }

          // Server ack for an op we sent — correct any drift in our revision
          if (msg.type === "ack") {
            if (typeof msg.revision === "number") {
              revisionRef.current = msg.revision;
              setRevision(msg.revision);
            }
            return;
          }

          // A remote op from another user — apply and remap our cursor
          if (msg.type === "operation") {
            const op = msg.operation as RemoteOperation;
            const me = userRef.current;
            if (me && msg.user_id === me.id) return; // we already applied locally

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
            setTypingUsers((prev) =>
              prev.includes(msg.user_id) ? prev : [...prev, msg.user_id],
            );
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((id) => id !== msg.user_id));
            }, 2000);
            return;
          }

          if (msg.type === "error") {
            console.error("WS error:", msg.message);
          }
        });

        ws.connect();
        wsRef.current = ws;
      } catch (e) {
        console.error("Failed to load document", e);
        setDocLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      if (wsRef.current) wsRef.current.disconnect();
    };
  }, [documentId, user, isAuthenticated, authLoading]);

  // Apply pending cursor selection AFTER React commits the new content.
  // useLayoutEffect runs synchronously before the browser paints, avoiding
  // a flicker of the cursor jumping to the end and back.
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

    // Send each op in order, bumping our optimistic revision per send so
    // the server sees the right "based on" revision for the next op.
    for (const op of ops) {
      ws.send({ type: "operation", operation: op });
      revisionRef.current += 1;
    }
    setRevision(revisionRef.current);
  }, []);

  const handleCursorMove = useCallback(
    (position: number) => {
      if (wsRef.current && isAuthenticated) {
        wsRef.current.send({ type: "cursor", position });
      }
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

      {/* Panels */}
      <VersionHistoryPanel
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        documentId={documentId}
      />
      <SharePanel
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        documentId={documentId}
      />
      <CommentsPanel
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
      <AIAssistantPanel isOpen={showAI} onClose={() => setShowAI(false)} />

      {/* Delete confirmation */}
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
