"use client";

import { useEffect, useState, useRef } from 'react';
import { documentService, authService, User } from '@/lib/documentService';
import { CollabWebSocket } from '@/lib/websocket';
import { getOperationFromDiff, applyOperation } from '@/lib/ot';

export function Editor({ documentId }: { documentId: string }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Loading...');
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

  return (
    <div className="flex-1 w-full flex flex-col items-center bg-surface-hover p-4 lg:p-8 animate-fade-in relative">
      <div className="w-full max-w-4xl glass rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm border-border-color">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          {saving && (
            <span className="px-2.5 py-1 text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full animate-pulse transition-all">
              Saving...
            </span>
          )}
        </div>

        {/* Dynamic Active Users Presence */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center px-4 animate-fade-in">
            <div className="flex -space-x-3">
              {onlineUsers.slice(0, 3).map((uid, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full bg-brand-500 border-2 border-surface flex items-center justify-center text-xs text-white font-bold shadow-sm" style={{ zIndex: 10 - idx }}>
                  {uid.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="ml-4 text-xs font-medium text-foreground/60">{onlineUsers.length} editing</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-surface rounded-2xl shadow-xl shadow-brand-500/5 min-h-[600px] border border-border-color flex flex-col overflow-hidden animate-slide-up">
        {user ? (
          <textarea 
             className="flex-1 p-8 outline-none text-foreground leading-relaxed bg-transparent resize-none font-mono"
             value={content}
             onChange={handleChange}
             placeholder="Start typing your collaborative document here..."
          />
        ) : (
          <div className="flex-1 p-8 text-center text-foreground/50">Please sign in to edit this document.</div>
        )}
      </div>
    </div>
  );
}

