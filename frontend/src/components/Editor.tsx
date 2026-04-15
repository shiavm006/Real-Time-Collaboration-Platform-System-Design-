"use client";

import { useEffect, useState, useRef } from 'react';
import { documentService, authService, User } from '@/lib/documentService';
import { CollabWebSocket } from '@/lib/websocket';
import { getOperationFromDiff, applyOperation } from '@/lib/ot';

export function Editor({ documentId }: { documentId: string }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const wsRef = useRef<CollabWebSocket | null>(null);

  useEffect(() => {
    let ws: CollabWebSocket;
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const u = await authService.getMe();
        setUser(u);
        const doc = await documentService.getDocument(documentId);
        setContent(doc.content || '');
        setTitle(doc.title);
        setRevision(doc.version || 0);

        ws = new CollabWebSocket(documentId, token);
        ws.on('message', (msg: any) => {
           if (msg.type === "operation") {
              const op = msg.operation;
              // Only apply operations from OTHER users
              if (msg.user_id !== u.id) {
                 setContent(prev => applyOperation(prev, op));
                 setRevision(op.revision + 1);
              }
           }
           if (msg.type === "init") {
              setContent(msg.content);
              setRevision(msg.revision);
           }
           if (msg.type === "presence") {
              setOnlineUsers(msg.online_users || []);
           }
        });
        ws.connect();
        wsRef.current = ws;
      } catch (e) {
        console.error("Failed to load document or WS", e);
      }
    };
    init();

    return () => {
      if (wsRef.current) wsRef.current.disconnect();
    };
  }, [documentId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!user) return;
    const newText = e.target.value;
    const op = getOperationFromDiff(content, newText, revision, user.id);

    setContent(newText);

    if (op && wsRef.current) {
       setSaving(true);
       wsRef.current.send({ type: "operation", operation: op });
       setRevision(r => r + 1);
       setTimeout(() => setSaving(false), 500);
    }
  };

  // Color palette for user avatars
  const avatarColors = ['#e8590c', '#2b8a3e', '#1971c2', '#9c36b5', '#c92a2a', '#087f5b'];

  return (
    <div style={{
      flex: 1,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#ffffff',
    }}>
      {/* Thin toolbar */}
      <div style={{
        width: '100%',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--muted)',
            margin: 0,
          }}>
            {title || 'Untitled'}
          </h2>
          {saving && (
            <span style={{
              fontSize: '11px',
              color: 'var(--muted)',
              fontWeight: 400,
            }}>
              Saving...
            </span>
          )}
        </div>

        {/* Presence indicators */}
        {onlineUsers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <div style={{ display: 'flex', marginRight: '4px' }}>
              {onlineUsers.slice(0, 4).map((uid, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: avatarColors[idx % avatarColors.length],
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#ffffff',
                    fontWeight: 600,
                    marginLeft: idx > 0 ? '-6px' : '0',
                    zIndex: 10 - idx,
                    position: 'relative',
                  }}
                >
                  {uid.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            <span style={{
              fontSize: '11px',
              color: 'var(--muted)',
              fontWeight: 400,
            }}>
              {onlineUsers.length} {onlineUsers.length === 1 ? 'viewer' : 'viewers'}
            </span>
          </div>
        )}
      </div>

      {/* Editor area — mimics a clean page */}
      <div style={{
        width: '100%',
        maxWidth: '720px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 24px 96px',
      }}>
        {/* Page title display */}
        <h1 style={{
          fontSize: '40px',
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-0.03em',
          marginBottom: '2px',
          lineHeight: 1.2,
        }}>
          {title || 'Untitled'}
        </h1>

        {/* Subtle divider */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: 'var(--border-color)',
          margin: '16px 0 24px',
          opacity: 0.6,
        }} />

        {user ? (
          <textarea
            style={{
              flex: 1,
              width: '100%',
              outline: 'none',
              border: 'none',
              resize: 'none',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              fontSize: '16px',
              lineHeight: '1.7',
              fontFamily: 'inherit',
              letterSpacing: '-0.003em',
            }}
            value={content}
            onChange={handleChange}
            placeholder="Start writing..."
          />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            fontSize: '14px',
          }}>
            Please sign in to edit this document.
          </div>
        )}
      </div>
    </div>
  );
}
