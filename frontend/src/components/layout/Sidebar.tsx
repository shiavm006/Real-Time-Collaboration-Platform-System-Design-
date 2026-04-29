"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { documentService, type DocumentInfo } from "@/lib/documentService";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonSidebar } from "@/components/ui/Skeleton";

const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const DocIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 opacity-50"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const HomeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SunIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setDocsLoading(false);
      return;
    }
    const fetchDocs = async () => {
      try {
        const docs = await documentService.getDocuments();
        setDocuments(docs);
      } catch {
        // silently fail
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, [isAuthenticated]);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-surface border-r border-border-color
          flex flex-col
          transition-all duration-300 ease-out
          ${isOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:w-[68px] lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-color shrink-0">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center text-background font-bold text-[11px] shrink-0">
              C
            </div>
            <span
              className={`font-semibold text-foreground tracking-tight whitespace-nowrap transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}
            >
              CollabDoc
            </span>
          </Link>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted transition-colors"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronIcon collapsed={!isOpen} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {/* Home link */}
          <Link
            href="/"
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                pathname === "/"
                  ? "bg-surface-hover text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }
            `}
          >
            <HomeIcon />
            <span
              className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}
            >
              Dashboard
            </span>
          </Link>

          {/* Search */}
          {isOpen && isAuthenticated && (
            <div className="px-1 mt-3 mb-2">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-surface-hover border border-border-color rounded-md text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          )}

          {/* Documents list */}
          {isOpen && isAuthenticated && (
            <div className="mt-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                Documents
              </div>
              {docsLoading ? (
                <SkeletonSidebar />
              ) : filteredDocs.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted/60">
                  {searchQuery ? "No matches" : "No documents yet"}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredDocs.map((doc) => {
                    const isActive = pathname === `/editor/${doc.id}`;
                    return (
                      <Link
                        key={doc.id}
                        href={`/editor/${doc.id}`}
                        className={`
                          flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm
                          transition-colors duration-150 truncate
                          ${
                            isActive
                              ? "bg-surface-hover text-foreground font-medium"
                              : "text-muted hover:text-foreground hover:bg-surface-hover"
                          }
                        `}
                      >
                        <DocIcon />
                        <span className="truncate">{doc.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border-color p-2 space-y-1 shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors w-full"
          >
            {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            <span
              className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}
            >
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          {user && (
            <div
              className={`flex items-center gap-3 px-3 py-2 ${isOpen ? "" : "justify-center"}`}
            >
              <Avatar name={user.full_name} userId={user.id} size="sm" />
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[11px] text-muted truncate">
                    {user.email}
                  </p>
                </div>
              )}
              {isOpen && (
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-danger transition-colors"
                  title="Logout"
                >
                  <LogoutIcon />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
