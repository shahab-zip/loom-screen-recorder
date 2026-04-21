import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = register(name.trim(), email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#030213] tracking-tight">
            Create your account
          </h1>
          <p className="text-[#717182] text-sm mt-2">
            Start recording and sharing in seconds
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
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

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
              placeholder="At least 6 characters"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#717182] mt-6">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
