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
      <nav className="glass sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-brand-300 flex items-center justify-center text-white font-bold text-lg">
            C
          </div>
          <Link href="/" className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-brand-500">
            CollabDoc
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground/80">{user.full_name}</span>
              <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setIsAuthOpen(true)} className="text-sm font-medium hover:text-brand-500 transition-colors">
                Sign In
              </button>
              <button onClick={() => setIsAuthOpen(true)} className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-full transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-95">
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={fetchUser} />
    </>
  );
}

