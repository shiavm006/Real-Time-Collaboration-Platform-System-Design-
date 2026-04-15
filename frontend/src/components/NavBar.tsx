"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AuthModal } from './AuthModal';
import { User, authService } from '@/lib/documentService';

export function NavBar() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const u = await authService.getMe();
        setUser(u);
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link
          href="/"
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--foreground)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          CollabDoc
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontSize: '13px',
                color: 'var(--muted)',
                fontWeight: 400,
              }}>
                {user.full_name}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Log out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setIsAuthOpen(true)}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Log in
              </button>
              <button
                onClick={() => setIsAuthOpen(true)}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#191919',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 14px',
                  borderRadius: '4px',
                  height: '28px',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Get started
              </button>
            </div>
          )}
        </div>
      </nav>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={fetchUser} />
    </>
  );
}
