import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentRole } from '../hooks/useCurrentRole';
import { getAssignableRoles } from '../lib/permissions';
import { invitesRepo } from '../lib/repos/invites';
import type { Role } from '../lib/auth-types';

export function InviteMemberModal({ workspaceId, onClose, onCreated }: { workspaceId: string; onClose: () => void; onCreated?: () => void }) {
  const { state } = useAuth();
  const role = useCurrentRole();
  const assignable = (role ? getAssignableRoles(role) : (['admin','member','viewer'] as Role[]))
    .filter(r => r !== 'owner') as Exclude<Role,'owner'>[];

  const [email, setEmail] = useState('');
  const [selRole, setSelRole] = useState<Exclude<Role,'owner'>>(assignable[0] ?? 'member');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.currentUser) return;
    setSubmitting(true); setError(null);
    const res = await invitesRepo.create({ workspaceId, email: email.trim(), role: selRole, invitedBy: state.currentUser.id });
    setSubmitting(false);
    if (res.error) { setError(res.error.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Invite a teammate</h2>
        <label className="block text-sm font-medium mb-1" htmlFor="invite-email">Email</label>
        <input id="invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
               className="w-full border rounded px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1" htmlFor="invite-role">Role</label>
        <select id="invite-role" value={selRole} onChange={e => setSelRole(e.target.value as Exclude<Role,'owner'>)}
                className="w-full border rounded px-3 py-2 mb-3">
          {assignable.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
          <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded">
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}
