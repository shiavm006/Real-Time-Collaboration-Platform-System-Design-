"use client";

import { useState } from 'react';
import { api } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const res = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        localStorage.setItem('token', res.data.access_token);
        onSuccess();
        onClose();
      } else {
        await api.post('/auth/register', { email, password, full_name: fullName });
        // Auto-login after register
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const res = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        localStorage.setItem('token', res.data.access_token);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm glass rounded-2xl shadow-2xl p-8 border border-border-color animate-slide-up">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-sm text-foreground/60 mb-6">
          {isLogin ? 'Enter your details to access your documents.' : 'Sign up to start collaborating.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-foreground/60">
             {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-brand-500 hover:text-brand-400 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-foreground/40 hover:text-foreground">
          ✕
        </button>
      </div>
    </div>
  );
}
