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
      const doc = await documentService.createDocument(newTitle || "Untitled Document");
      router.push(`/editor/${doc.id}`);
    } catch (e) {
      console.error("Failed to create document.");
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12 animate-fade-in relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Recent Documents</h1>
          <p className="text-sm text-foreground/60 mt-1">Pick up where you left off</p>
        </div>
        <button onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Document
        </button>
      </div>

      {!loading && documents.length === 0 ? (
        <div className="text-center py-20 text-foreground/50 border border-dashed border-border-color rounded-2xl">
           <p>No documents found. Start by creating a new one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc, i) => (
            <Link 
              href={`/editor/${doc.id}`} 
              key={doc.id}
              className="group relative flex flex-col bg-surface hover:bg-surface-hover border border-border-color rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-32 mb-4 rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/20 flex items-center justify-center border border-brand-200/50 dark:border-brand-800/50 group-hover:scale-[1.02] transition-transform duration-300">
                <svg className="w-12 h-12 text-brand-400 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h3 className="font-semibold text-lg text-foreground truncate">{doc.title}</h3>
              <div className="flex items-center justify-between mt-auto pt-4 text-xs text-foreground/50">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                  Doc
                </span>
                <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modern Create Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass rounded-2xl shadow-2xl border border-border-color animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-border-color flex items-center justify-between">
               <h2 className="text-xl font-bold tracking-tight text-foreground">Create New Document</h2>
               <button onClick={() => setIsModalOpen(false)} className="text-foreground/40 hover:text-foreground transition-colors p-1" title="Close">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
            </div>
            
            <form onSubmit={handleCreateDocument} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-foreground/80">Document Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Architecture Design Draft"
                  className="w-full px-4 py-3 bg-surface border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-foreground placeholder:text-foreground/30 transition-all font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface border border-border-color rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="px-5 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                >
                  {isCreating ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

