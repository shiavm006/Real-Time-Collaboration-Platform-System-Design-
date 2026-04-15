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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--surface)',
    color: 'var(--foreground)',
    transition: 'border-color 0.15s',
    lineHeight: '1.5',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--muted)',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
          padding: '32px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: '4px',
          letterSpacing: '-0.01em',
        }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'var(--muted)',
          marginBottom: '24px',
          lineHeight: '1.5',
        }}>
          {isLogin
            ? 'Enter your credentials to continue.'
            : 'Sign up to start collaborating on documents.'}
        </p>

        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: '13px',
            border: '1px solid #fecaca',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2383e2')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#2383e2')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#2383e2')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#2383e2',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Continue' : 'Create account')}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--muted)',
        }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2383e2',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              padding: 0,
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '18px',
            padding: '4px',
            lineHeight: 1,
            borderRadius: '4px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
