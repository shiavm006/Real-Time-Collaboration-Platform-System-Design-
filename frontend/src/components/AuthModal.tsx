"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setError("");
    setShowPassword(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {showPassword ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLogin ? "Welcome back" : "Create an account"}
      description={isLogin ? "Enter your details to access your documents." : "Sign up to start collaborating in real-time."}
      maxWidth="max-w-sm"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <Input
            label="Full Name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
          />
        )}

        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <EyeIcon />
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full"
        >
          {isLogin ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm">
        <span className="text-muted">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
        </span>
        <button
          type="button"
          onClick={toggleMode}
          className="text-foreground underline hover:text-brand-600 font-medium transition-colors"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </div>
    </Modal>
  );
}
