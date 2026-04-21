import React, { useState } from 'react';
import type { Role } from '../../lib/auth-types';
import { ROLE_LABELS } from '../../lib/auth-types';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getAssignableRoles } from '../../lib/permissions';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { inviteMember, currentRole, currentWorkspace } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !currentRole) return null;

  const assignableRoles = getAssignableRoles(currentRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const invite = inviteMember(email.trim(), role);
    if (invite) {
      setSuccess(true);
      setEmail('');
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } else {
      setError('Failed to send invite');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] shadow-2xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-bold text-[#030213] mb-1">
          Invite to {currentWorkspace?.name || 'workspace'}
        </h2>
        <p className="text-sm text-[#717182] mb-5">
          Send an invite link via email
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              Invite sent successfully!
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)]"
            >
              {assignableRoles.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-[#030213] text-sm font-semibold hover:bg-[#e9ebef] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all shadow-md shadow-red-600/20"
            >
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
