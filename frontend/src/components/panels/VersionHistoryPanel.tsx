"use client";

import { useEffect, useState } from "react";
import { documentService, type VersionInfo } from "@/lib/documentService";
import { Button } from "@/components/ui/Button";

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

export function VersionHistoryPanel({ isOpen, onClose, documentId }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      setLoading(true);
      documentService
        .getVersions(documentId)
        .then(setVersions)
        .catch(() => setVersions([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-surface border-l border-border-color shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border-color shrink-0">
          <h3 className="font-semibold text-foreground">Version History</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3">
          {loading ? (
            <div className="space-y-3 px-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-lg" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded flex items-center justify-center text-foreground mb-4 border border-border-color bg-surface">
                <ClockIcon />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No versions yet</p>
              <p className="text-xs text-muted">Versions are created automatically as you edit.</p>
            </div>
          ) : (
            <div className="px-3">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className="relative flex gap-3 px-2 py-3 group"
                >
                  {/* Timeline */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? "bg-foreground border-foreground" : "bg-surface border-border-hover"}`} />
                    {i < versions.length - 1 && (
                      <div className="w-px flex-1 bg-border-color mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        Revision {version.revision}
                      </p>
                      <Button variant="ghost" size="sm" isLoading={loading} onClick={async () => {
                        setLoading(true);
                        try {
                          await documentService.restoreVersion(documentId, version.id);
                          onClose(); // Close panel on success, WebSocket will trigger reload
                        } catch (e) {
                          console.error("Failed to restore", e);
                        } finally {
                          setLoading(false);
                        }
                      }}>
                        Restore
                      </Button>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted/60 mt-1 truncate">
                      {version.snapshot.slice(0, 80)}{version.snapshot.length > 80 ? "…" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
