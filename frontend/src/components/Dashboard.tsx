"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { documentService, DocumentInfo } from '@/lib/documentService';

export function Dashboard() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDocs = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const docs = await documentService.getDocuments();
        setDocuments(docs);
      } catch (e) {
        console.error("Failed to fetch docs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const openCreateModal = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Please sign in first!");
      return;
    }
    setNewTitle('');
    setIsModalOpen(true);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const doc = await documentService.createDocument(newTitle || "Untitled");
      router.push(`/editor/${doc.id}`);
    } catch (e) {
      console.error("Failed to create document.");
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '48px 24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-0.025em',
        }}>
          Documents
        </h1>
        <button
          onClick={openCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#2383e2',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '4px',
            height: '32px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New page
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          padding: '60px 0',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px',
        }}>
          Loading...
        </div>
      ) : documents.length === 0 ? (
        <div style={{
          padding: '80px 24px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px',
          lineHeight: '1.6',
        }}>
          <svg
            width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 16px', color: '#d4d4d4' }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p style={{ marginBottom: '4px', color: 'var(--foreground)', fontWeight: 500 }}>No documents yet</p>
          <p>Create your first page to get started.</p>
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--muted)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <span>Title</span>
            <span style={{ textAlign: 'right' }}>Updated</span>
          </div>

          {/* Document rows */}
          {documents.map((doc) => (
            <Link
              href={`/editor/${doc.id}`}
              key={doc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px',
                padding: '10px 12px',
                textDecoration: 'none',
                color: 'inherit',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {doc.title}
                </span>
              </span>
              <span style={{
                fontSize: '12px',
                color: 'var(--muted)',
                textAlign: 'right',
              }}>
                {formatDate(doc.updated_at)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--foreground)',
              }}>
                New page
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '4px',
                  borderRadius: '4px',
                  lineHeight: 1,
                  fontSize: '16px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} style={{ padding: '20px 24px 24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}>
                  Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Untitled"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '14px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--foreground)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2383e2')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#ffffff',
                    backgroundColor: '#2383e2',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { if (!isCreating) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { if (!isCreating) e.currentTarget.style.opacity = '1'; }}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
