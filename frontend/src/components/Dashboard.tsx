"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, type DocumentInfo } from "@/lib/documentService";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { AuthModal } from "@/components/AuthModal";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";

const LogoutIcon = () => (
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
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const DocIcon = () => (
  <svg
    className="w-8 h-8 text-brand-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const GridIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ListIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
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
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EmptyDocIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

export function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete modal
  const [deleteDoc, setDeleteDoc] = useState<DocumentInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setDocuments([]);
      return;
    }
    const fetchDocs = async () => {
      try {
        const docs = await documentService.getDocuments();
        setDocuments(docs);
      } catch {
        console.error("Failed to fetch documents");
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [isAuthenticated, authLoading]);

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [documents, searchQuery],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const doc = await documentService.createDocument(
        newTitle || "Untitled Document",
      );
      router.push(`/editor/${doc.id}`);
    } catch {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(deleteDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setDeleteDoc(null);
    } catch {
      console.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreate = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setNewTitle("");
    setIsCreateOpen(true);
  };

  // Not authenticated view
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-32 animate-fade-in">
        <div className="w-12 h-12 rounded bg-foreground flex items-center justify-center text-background font-bold text-xl mb-6">
          C
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Welcome to CollabDoc
        </h1>
        <p className="text-secondary text-center max-w-sm mb-8 text-sm">
          Real-time collaborative document editing. Create, share, and work
          together seamlessly.
        </p>
        <Button variant="primary" onClick={() => setShowAuthModal(true)}>
          Get Started
        </Button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            My Documents
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {loading
              ? "Loading..."
              : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="primary" icon={<PlusIcon />} onClick={openCreate}>
            New Document
          </Button>

          <div className="h-6 w-px bg-border-color" />

          {user && (
            <DropdownMenu
              trigger={
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar name={user.full_name} userId={user.id} size="sm" />
                  <span className="text-sm font-medium text-foreground hidden sm:block">
                    {user.full_name}
                  </span>
                </button>
              }
              items={[
                { label: user.email, onClick: () => {} },
                {
                  label: "Sign out",
                  icon: <LogoutIcon />,
                  onClick: logout,
                  variant: "danger",
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Toolbar: Search + View toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>
        <div className="flex items-center bg-surface border border-border-color rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground"}`}
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground"}`}
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={<SearchIcon />}
            title="No results found"
            description={`No documents matching "${searchQuery}". Try a different search.`}
          />
        ) : (
          <EmptyState
            icon={<EmptyDocIcon />}
            title="No documents yet"
            description="Create your first document to start collaborating in real-time."
            actionLabel="Create Document"
            onAction={openCreate}
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, i) => (
            <div
              key={doc.id}
              className="group relative bg-surface border border-border-color rounded-xl transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-neutral-950/5 hover:-translate-y-0.5 animate-slide-up"
              style={{
                animationDelay: `${i * 50}ms`,
                animationFillMode: "both",
              }}
            >
              <Link href={`/editor/${doc.id}`} className="block p-5">
                <div className="h-24 mb-4 rounded-lg bg-surface flex items-center justify-center border border-border-color group-hover:bg-surface-hover transition-colors duration-200">
                  <DocIcon />
                </div>
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-muted">
                  {doc.updated_at
                    ? new Date(doc.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently created"}
                </p>
              </Link>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteDoc(doc);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-surface/80 border border-border-color text-muted hover:text-danger hover:border-danger/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border-color rounded-xl overflow-hidden divide-y divide-border-color">
          {filteredDocs.map((doc, i) => (
            <Link
              key={doc.id}
              href={`/editor/${doc.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors group animate-slide-up"
              style={{
                animationDelay: `${i * 30}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="w-9 h-9 rounded bg-surface border border-border-color flex items-center justify-center shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-foreground"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-muted">
                  {doc.updated_at
                    ? new Date(doc.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recently"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteDoc(doc);
                }}
                className="p-1.5 rounded-md text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Document"
        description="Give your document a name to get started."
      >
        <form onSubmit={handleCreate}>
          <Input
            autoFocus
            placeholder="e.g. Architecture Design Draft"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteDoc?.title}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteDoc(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
