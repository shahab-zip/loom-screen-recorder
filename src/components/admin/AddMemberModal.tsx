// src/components/admin/AddMemberModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';
import type { ProfileRow } from '../../lib/repos/profiles';
import type { Role } from '../../lib/auth-types';

type Mode = 'existing' | 'invite';

interface Props {
  workspaceId: string;
  users: ProfileRow[];
  existingMemberIds: Set<string>;
  onAddExisting: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onInvite: (email: string, role: Exclude<Role, 'owner'>) => Promise<{ error: { message: string } | null }>;
  onClose: () => void;
}

export function AddMemberModal({ users, existingMemberIds, onAddExisting, onInvite, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('existing');
  const [role, setRole] = useState<Role>('member');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addable = useMemo(() => users.filter(u => !existingMemberIds.has(u.id)), [users, existingMemberIds]);

  // Ensure a default user is always selected once the addable list is known,
  // even if the user never touches the <select>.
  useEffect(() => {
    if (!userId && addable[0]?.id) setUserId(addable[0].id);
  }, [addable, userId]);

  // Owner role cannot be sent as an invite — drop back to member if the user
  // flips to invite mode while Owner was selected.
  useEffect(() => {
    if (mode === 'invite' && role === 'owner') setRole('member');
  }, [mode, role]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    if (mode === 'existing') {
      const target = userId || addable[0]?.id;
      if (!target) { setBusy(false); return; }
      const { error } = await onAddExisting(target, role);
      setBusy(false);
      if (error) { setError(error.message); return; }
    } else {
      const e = email.trim().toLowerCase();
      if (!e || !/.+@.+\..+/.test(e)) { setBusy(false); setError('Enter a valid email.'); return; }
      if (role === 'owner') { setBusy(false); setError('Owner role cannot be invited; assign after accept.'); return; }
      const { error } = await onInvite(e, role as Exclude<Role, 'owner'>);
      setBusy(false);
      if (error) { setError(error.message); return; }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add member</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div role="tablist" className="flex border-b border-gray-100 px-2">
          <button
            role="tab"
            aria-selected={mode === 'existing'}
            onClick={() => setMode('existing')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              mode === 'existing' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Existing user
          </button>
          <button
            role="tab"
            aria-selected={mode === 'invite'}
            onClick={() => setMode('invite')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              mode === 'invite' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Mail className="w-4 h-4" /> Invite by email
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === 'existing' ? (
            addable.length === 0 ? (
              <p className="text-sm text-gray-500">All users are already members of this workspace.</p>
            ) : (
              <div>
                <label htmlFor="user-select" className="block text-xs font-semibold text-gray-600 mb-1">User</label>
                <select
                  id="user-select"
                  value={userId || addable[0].id}
                  onChange={e => setUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {addable.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}
          <div>
            <label htmlFor="role-select" className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
            <select
              id="role-select"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {mode === 'existing' && <option value="owner">Owner</option>}
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || (mode === 'existing' && addable.length === 0)}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {busy ? '…' : mode === 'existing' ? 'Add member' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
