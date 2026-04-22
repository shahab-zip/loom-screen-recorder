// src/components/admin/WorkspaceDetailPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, UserPlus, Trash2, Crown, Mail } from 'lucide-react';
import type { WorkspaceRow } from '../../lib/repos/workspaces';
import type { ProfileRow } from '../../lib/repos/profiles';
import type { MembershipRow } from '../../lib/repos/memberships';
import type { InviteRow } from '../../lib/repos/invites';
import type { Role } from '../../lib/auth-types';
import { AddMemberModal } from './AddMemberModal';

type MemberWithProfile = MembershipRow & { profiles?: Pick<ProfileRow, 'id' | 'name' | 'email' | 'avatar'> };

interface Props {
  workspace: WorkspaceRow;
  users: ProfileRow[];
  onBack: () => void;
  loadMembers: (wsId: string) => Promise<{ data: MemberWithProfile[] | null; error: { message: string } | null }>;
  loadInvites: (wsId: string) => Promise<{ data: InviteRow[] | null; error: { message: string } | null }>;
  onSetRole: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onRemoveMember: (userId: string) => Promise<{ error: { message: string } | null }>;
  onRevokeInvite: (inviteId: string) => Promise<{ error: { message: string } | null }>;
  onAddExisting: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onInvite: (email: string, role: Exclude<Role, 'owner'>) => Promise<{ error: { message: string } | null }>;
}

export function WorkspaceDetailPanel({
  workspace, users, onBack, loadMembers, loadInvites,
  onSetRole, onRemoveMember, onRevokeInvite, onAddExisting, onInvite,
}: Props) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Refetches after mutations don't toggle initialLoading, so the tables stay
  // mounted and we avoid a visible flash/unmount between ops.
  const reload = async () => {
    const [m, i] = await Promise.all([loadMembers(workspace.id), loadInvites(workspace.id)]);
    setMembers((m.data ?? []) as MemberWithProfile[]);
    setInvites((i.data ?? []).filter(r => r.status === 'pending'));
  };

  useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    (async () => {
      await reload();
      if (!cancelled) setInitialLoading(false);
    })();
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [workspace.id]);

  const memberIds = useMemo(() => new Set(members.map(m => m.user_id)), [members]);
  const ownerCount = useMemo(() => members.filter(m => m.role === 'owner').length, [members]);

  const changeRole = async (m: MemberWithProfile, role: Role) => {
    if (m.role === 'owner' && role !== 'owner' && ownerCount <= 1) {
      alert('This is the last owner. Promote another member to owner first.');
      return;
    }
    setBusyId(m.user_id);
    const { error } = await onSetRole(m.user_id, role);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setMembers(prev => prev.map(x => x.user_id === m.user_id ? { ...x, role } : x));
  };

  const remove = async (m: MemberWithProfile) => {
    if (m.role === 'owner' && ownerCount <= 1) {
      alert('Cannot remove the last owner. Promote another member first.');
      return;
    }
    if (!confirm(`Remove ${m.profiles?.name || m.profiles?.email || 'this user'} from "${workspace.name}"?`)) return;
    setBusyId(m.user_id);
    const { error } = await onRemoveMember(m.user_id);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
  };

  const revoke = async (inv: InviteRow) => {
    if (!confirm(`Revoke invite for ${inv.email}?`)) return;
    setBusyId(inv.id);
    const { error } = await onRevokeInvite(inv.id);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setInvites(prev => prev.filter(x => x.id !== inv.id));
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to workspaces
      </button>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-black" style={{ backgroundColor: workspace.color }}>
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{workspace.name}</h2>
            {workspace.description && <p className="text-sm text-gray-500">{workspace.description}</p>}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
        >
          <UserPlus className="w-4 h-4" /> Add member
        </button>
      </div>

      {initialLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Members ({members.length})</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(m => (
                  <tr key={m.user_id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold">
                          {(m.profiles?.name || m.profiles?.email || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{m.profiles?.name || m.profiles?.email || m.user_id}</div>
                          <div className="text-xs text-gray-400">{m.profiles?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        aria-label="Role"
                        value={m.role}
                        disabled={busyId === m.user_id}
                        onChange={e => changeRole(m, e.target.value as Role)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      {m.role === 'owner' && <Crown className="inline-block w-3.5 h-3.5 text-yellow-500 ml-1.5 -mt-0.5" />}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        title="Remove member"
                        onClick={() => remove(m)}
                        disabled={busyId === m.user_id}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invites.length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Pending invites ({invites.length})</h3>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    {invites.map(inv => (
                      <tr key={inv.id}>
                        <td className="px-5 py-3 text-sm text-gray-800 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" /> {inv.email}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">{inv.role}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => revoke(inv)}
                            disabled={busyId === inv.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddMemberModal
          workspaceId={workspace.id}
          users={users}
          existingMemberIds={memberIds}
          onAddExisting={async (uid, role) => {
            const res = await onAddExisting(uid, role);
            if (!res.error) await reload();
            return res;
          }}
          onInvite={async (email, role) => {
            const res = await onInvite(email, role);
            if (!res.error) await reload();
            return res;
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
