"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  documentService,
  type PermissionEntry,
} from "@/lib/documentService";
import { useAuth } from "@/contexts/AuthContext";

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
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

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

function extractError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: string } }; message?: string };
  return err?.response?.data?.detail ?? err?.message ?? fallback;
}

export function SharePanel({ isOpen, onClose, documentId }: SharePanelProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      const perms = await documentService.getPermissions(documentId);
      setPermissions(perms);
    } catch (e) {
      console.error("Failed to load permissions", e);
      setError(extractError(e, "Failed to load permissions"));
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      setError(null);
      setInfo(null);
      loadPermissions();
    }
  }, [isOpen, documentId, loadPermissions]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await documentService.grantPermissionByEmail(
        documentId,
        email.trim(),
        role,
      );
      setEmail("");
      setInfo(`Invited ${email.trim()} as ${role}`);
      await loadPermissions();
    } catch (e) {
      setError(extractError(e, "Failed to invite user"));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: string) => {
    setError(null);
    setInfo(null);
    setPendingUserId(userId);
    try {
      await documentService.updateRole(documentId, userId, nextRole);
      await loadPermissions();
    } catch (e) {
      setError(extractError(e, "Failed to update role"));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRevoke = async (userId: string, label: string) => {
    if (!confirm(`Remove access for ${label}?`)) return;
    setError(null);
    setInfo(null);
    setPendingUserId(userId);
    try {
      await documentService.revokePermission(documentId, userId);
      setInfo(`Removed access for ${label}`);
      await loadPermissions();
    } catch (e) {
      setError(extractError(e, "Failed to remove access"));
    } finally {
      setPendingUserId(null);
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/editor/${documentId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sort: owner first, then alphabetically by name
  const sortedPerms = [...permissions].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const isCurrentUser = (uid: string) => user?.id === uid;
  const ownerCount = sortedPerms.filter((p) => p.role === "owner").length;
  // Owner shouldn't be able to manage their own row.
  const canManage = (p: PermissionEntry) =>
    p.role !== "owner" && !isCurrentUser(p.user_id);

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
          {/* Banner: error / info */}
          {error && (
            <div className="px-3 py-2 text-xs rounded-md bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="px-3 py-2 text-xs rounded-md bg-green-50 border border-green-200 text-green-700">
              {info}
            </div>
          )}

          {/* Add people */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Invite people
            </h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInvite();
                  }}
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
            <Button
              variant="primary"
              size="sm"
              className="mt-3 w-full"
              isLoading={loading}
              onClick={handleInvite}
            >
              Send invite
            </Button>
            <p className="mt-2 text-[11px] text-muted leading-relaxed">
              The recipient must already have an account. They&apos;ll see this
              document in their dashboard the next time they refresh.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border-color" />

          {/* Copy link */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Share link
            </h4>
            <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg border border-border-color">
              <p className="flex-1 text-xs text-muted truncate font-mono">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/editor/${documentId}`
                  : ""}
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
            <p className="mt-2 text-[11px] text-muted leading-relaxed">
              Only people you&apos;ve invited will be able to open this link.
            </p>
          </div>

          {/* People with access */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              People with access
            </h4>
            <div className="space-y-2">
              {sortedPerms.length === 0 ? (
                <div className="text-xs text-muted py-4 text-center bg-surface-hover rounded-lg">
                  Loading…
                </div>
              ) : (
                sortedPerms.map((p) => {
                  const isMe = isCurrentUser(p.user_id);
                  const manageable = canManage(p);
                  const busy = pendingUserId === p.user_id;
                  return (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between bg-surface-hover p-3 rounded-lg border border-border-color"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.full_name}
                          {isMe && (
                            <span className="ml-1 text-muted font-normal">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted truncate">{p.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.role === "owner" ? (
                          <span className="text-xs font-medium px-2 py-1 bg-surface border border-border-color rounded text-muted capitalize">
                            owner
                          </span>
                        ) : manageable ? (
                          <select
                            value={p.role}
                            disabled={busy}
                            onChange={(e) =>
                              handleRoleChange(p.user_id, e.target.value)
                            }
                            className="text-xs px-2 py-1 bg-surface border border-border-color rounded text-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="text-xs font-medium px-2 py-1 bg-surface border border-border-color rounded text-muted capitalize">
                            {p.role}
                          </span>
                        )}

                        {manageable && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleRevoke(p.user_id, p.full_name || p.email)
                            }
                            title="Remove access"
                            className="p-1.5 rounded-md text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {ownerCount > 1 && (
              <p className="mt-2 text-[11px] text-amber-600">
                Multiple owner rows detected — this is a legacy data state. New
                grants enforce a single owner.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
