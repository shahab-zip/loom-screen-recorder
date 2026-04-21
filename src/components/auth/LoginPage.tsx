import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            Now in Beta
          </div>
          <h1 className="text-3xl font-bold text-[#030213] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[#717182] text-sm mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-[#717182] mt-6">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
