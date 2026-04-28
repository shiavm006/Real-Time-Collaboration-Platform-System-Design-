"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { documentService } from "@/lib/documentService";
import { CollabWebSocket, type ConnectionState } from "@/lib/websocket";
import { getOperationFromDiff, applyOperation } from "@/lib/ot";
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

  // Keep state in sync with refs for rendering
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setDocLoading(false);
      return;
    }

    let ws: CollabWebSocket;

    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const doc = await documentService.getDocument(documentId);
        setContent(doc.content || "");
        setTitle(doc.title);
        setRevision(doc.revision || 0);
        setDocLoading(false);

        ws = new CollabWebSocket(documentId, token);

        ws.onStateChange((state) => {
          setConnectionState(state);
        });

        ws.on("message", (msg: any) => {
          if (msg.type === "operation") {
            if (msg.user_id !== user.id) {
              const newContent = applyOperation(
                contentRef.current,
                msg.operation,
              );
              contentRef.current = newContent;
              revisionRef.current = msg.operation.revision;

              setContent(newContent);
              setRevision(msg.operation.revision);
            }
          }
          if (msg.type === "init") {
            contentRef.current = msg.content;
            revisionRef.current = msg.revision;
            setContent(msg.content);
            setRevision(msg.revision);
          }
          if (msg.type === "presence") {
            setOnlineUsers(
              Array.from(new Set(msg.online_users as string[])) || [],
            );
          }
          if (msg.type === "cursor") {
            if (msg.user_id !== user.id) {
              setTypingUsers((prev) => {
                if (!prev.includes(msg.user_id)) return [...prev, msg.user_id];
                return prev;
              });

              // Remove typing indicator after 2 seconds of inactivity
              setTimeout(() => {
                setTypingUsers((prev) =>
                  prev.filter((id) => id !== msg.user_id),
                );
              }, 2000);
            }
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
      if (wsRef.current) wsRef.current.disconnect();
    };
  }, [documentId, user, isAuthenticated, authLoading]);

  const handleContentChange = useCallback(
    (newText: string) => {
      if (!user) return;
      const op = getOperationFromDiff(
        contentRef.current,
        newText,
        revisionRef.current,
        user.id,
      );

      contentRef.current = newText;
      setContent(newText);

      if (op && wsRef.current) {
        setSaving(true);
        wsRef.current.send({ type: "operation", operation: op });

        const newRev = revisionRef.current + 1;
        revisionRef.current = newRev;
        setRevision(newRev);

        setTimeout(() => setSaving(false), 600);
      }
    },
    [user],
  );

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
