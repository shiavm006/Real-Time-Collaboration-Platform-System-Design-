"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { documentService } from "@/lib/documentService";

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function SharePanel({ isOpen, onClose, documentId }: SharePanelProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadPermissions();
    }
  }, [isOpen, documentId]);

  const loadPermissions = async () => {
    try {
      const perms = await documentService.getPermissions(documentId);
      setPermissions(perms);
    } catch (e) {
      console.error("Failed to load permissions", e);
    }
  };

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await documentService.grantPermissionByEmail(documentId, email, role);
      setEmail("");
      loadPermissions(); // Refresh the list
    } catch (e) {
      console.error("Failed to grant permission", e);
      alert("Failed to grant permission. User might not exist.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/editor/${documentId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-surface border-l border-border-color shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border-color shrink-0">
          <h3 className="font-semibold text-foreground">Share Document</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Add people */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Invite people</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 text-sm bg-surface border border-border-color rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button variant="primary" size="sm" className="mt-3 w-full" isLoading={loading} onClick={handleInvite}>
              Send invite
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t border-border-color" />

          {/* Copy link */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Share link</h4>
            <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg border border-border-color">
              <p className="flex-1 text-xs text-muted truncate font-mono">
                {typeof window !== "undefined" ? `${window.location.origin}/editor/${documentId}` : ""}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={copied ? <CheckIcon /> : <CopyIcon />}
                onClick={handleCopyLink}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* People with access */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">People with access</h4>
            <div className="space-y-3">
              {permissions.length === 0 ? (
                <div className="text-xs text-muted py-4 text-center bg-surface-hover rounded-lg">
                  Only you have access to this document
                </div>
              ) : (
                permissions.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-hover p-3 rounded-lg border border-border-color">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                      <p className="text-xs text-muted truncate">{p.email}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-surface border border-border-color rounded text-muted capitalize">
                      {p.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
