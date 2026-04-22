import { useEffect, useMemo, useState } from 'react';
import {
  Shield, Users, Briefcase, Activity, Search, Crown, Trash2, Check, X, ChevronRight, Plus,
} from 'lucide-react';
import { profilesRepo, type ProfileRow } from '../lib/repos/profiles';
import { workspacesRepo, type WorkspaceRow } from '../lib/repos/workspaces';
import { useAuth } from '../contexts/AuthContext';
import { CreateWorkspaceModal } from './admin/CreateWorkspaceModal';
import { WorkspaceDetailPanel } from './admin/WorkspaceDetailPanel';
import { membershipsRepo } from '../lib/repos/memberships';
import { invitesRepo } from '../lib/repos/invites';
import type { Role } from '../lib/auth-types';

type Tab = 'overview' | 'users' | 'workspaces';

interface WorkspaceWithMembers extends WorkspaceRow {
  memberships?: Array<{ user_id: string }>;
}

/**
 * Super Admin dashboard — global controls visible only to `is_super_admin`
 * profiles. Reads every profile and workspace via RLS bypass policies and
 * lets the admin toggle super-admin status or delete workspaces.
 */
export function SuperAdminPanel() {
  const { state: authState } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailWs, setDetailWs] = useState<WorkspaceWithMembers | null>(null);

  const reload = async () => {
    setLoading(true);
    const [u, w] = await Promise.all([
      profilesRepo.listAll(),
      workspacesRepo.listAllWithCounts(),
    ]);
    setUsers((u.data ?? []) as ProfileRow[]);
    setWorkspaces((w.data ?? []) as WorkspaceWithMembers[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggleSuperAdmin = async (u: ProfileRow) => {
    if (u.id === authState.currentUser?.id && u.is_super_admin) {
      if (!confirm('Remove YOUR own super admin rights? You will lose access to this panel.')) return;
    }
    setMutatingId(u.id);
    const { error } = await profilesRepo.setSuperAdmin(u.id, !u.is_super_admin);
    setMutatingId(null);
    if (error) {
      flash('Failed: ' + error.message);
      return;
    }
    flash(`${u.name || u.email} ${!u.is_super_admin ? 'promoted to' : 'removed from'} super admin`);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_super_admin: !u.is_super_admin } : x));
  };

  const handleDeleteWorkspace = async (ws: WorkspaceRow) => {
    if (!confirm(`Permanently delete workspace "${ws.name}" and all its memberships and invites? This cannot be undone.`)) return;
    setMutatingId(ws.id);
    const { error } = await workspacesRepo.remove(ws.id);
    setMutatingId(null);
    if (error) {
      flash('Failed: ' + error.message);
      return;
    }
    flash(`Workspace "${ws.name}" deleted`);
    setWorkspaces(prev => prev.filter(x => x.id !== ws.id));
  };

  // ── Derived stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const superAdmins = users.filter(u => u.is_super_admin).length;
    const totalMembers = workspaces.reduce((acc, w) => acc + (w.memberships?.length ?? 0), 0);
    const activeRecently = users.filter(u => {
      if (!u.last_login_at) return false;
      const days = (Date.now() - new Date(u.last_login_at).getTime()) / 86400000;
      return days <= 7;
    }).length;
    return { users: users.length, workspaces: workspaces.length, superAdmins, totalMembers, activeRecently };
  }, [users, workspaces]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const filteredWorkspaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(w => (w.name || '').toLowerCase().includes(q));
  }, [workspaces, search]);

  if (!authState.currentUser?.isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Super admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Super Admin
            </p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Console</h1>
            <p className="text-sm text-gray-500 mt-1">Full control over every user and workspace.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {([
            { id: 'overview' as Tab,   label: 'Overview',   icon: Activity },
            { id: 'users' as Tab,      label: `Users (${users.length})`, icon: Users },
            { id: 'workspaces' as Tab, label: `Workspaces (${workspaces.length})`, icon: Briefcase },
          ]).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  active ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg flex items-center gap-2 w-fit">
            <Check className="w-4 h-4 text-green-400" /> {toast}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : detailWs ? (
          <WorkspaceDetailPanel
            workspace={detailWs}
            users={users}
            onBack={() => { setDetailWs(null); reload(); }}
            loadMembers={(id) => membershipsRepo.listByWorkspace(id) as Promise<{ data: any; error: any }>}
            loadInvites={(id) => invitesRepo.listByWorkspace(id) as Promise<{ data: any; error: any }>}
            onSetRole={(uid, role) => membershipsRepo.setRole(uid, detailWs.id, role) as Promise<{ error: any }>}
            onRemoveMember={(uid) => membershipsRepo.remove(uid, detailWs.id) as Promise<{ error: any }>}
            onRevokeInvite={(iid) => invitesRepo.revoke(iid) as Promise<{ error: any }>}
            onAddExisting={(uid, role: Role) => membershipsRepo.insert({
              user_id: uid,
              workspace_id: detailWs.id,
              role,
              invited_by: authState.currentUser?.id ?? null,
            }) as Promise<{ error: any }>}
            onInvite={(email, role) => invitesRepo.create({
              workspaceId: detailWs.id,
              email,
              role,
              invitedBy: authState.currentUser!.id,
            }) as Promise<{ error: any }>}
          />
        ) : tab === 'overview' ? (
          <OverviewTab stats={stats} onJumpUsers={() => setTab('users')} onJumpWs={() => setTab('workspaces')} />
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={tab === 'users' ? 'Search users…' : 'Search workspaces…'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
              />
            </div>

            {tab === 'users' ? (
              <UsersTable
                users={filteredUsers}
                currentUserId={authState.currentUser?.id}
                mutatingId={mutatingId}
                onToggleSuperAdmin={handleToggleSuperAdmin}
              />
            ) : (
              <>
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" /> Create workspace
                  </button>
                </div>
                <WorkspacesTable
                  workspaces={filteredWorkspaces}
                  users={users}
                  mutatingId={mutatingId}
                  onDelete={handleDeleteWorkspace}
                  onOpen={setDetailWs}
                />
              </>
            )}
          </>
        )}
        {showCreate && (
          <CreateWorkspaceModal
            users={users}
            defaultOwnerId={authState.currentUser!.id}
            onCreate={async (ownerId, input) => {
              const res = await workspacesRepo.createAs(ownerId, input);
              if (!res.error) { flash(`Workspace "${input.name}" created`); await reload(); }
              return res as { data: unknown; error: { message: string } | null };
            }}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

interface OverviewProps {
  stats: { users: number; workspaces: number; superAdmins: number; totalMembers: number; activeRecently: number };
  onJumpUsers: () => void;
  onJumpWs: () => void;
}
function OverviewTab({ stats, onJumpUsers, onJumpWs }: OverviewProps) {
  const cards = [
    { label: 'Total users',         value: stats.users,          color: 'text-gray-900' },
    { label: 'Super admins',        value: stats.superAdmins,    color: 'text-red-600' },
    { label: 'Active (last 7 days)',value: stats.activeRecently, color: 'text-green-600' },
    { label: 'Workspaces',          value: stats.workspaces,     color: 'text-gray-900' },
    { label: 'Total memberships',   value: stats.totalMembers,   color: 'text-blue-600' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onJumpUsers}
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-200 hover:border-red-400 hover:shadow-md transition-all text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-gray-900 font-bold mb-1"><Users className="w-4 h-4" /> Manage users</div>
            <div className="text-xs text-gray-500">Promote or demote super admins, review recent activity.</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={onJumpWs}
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-200 hover:border-red-400 hover:shadow-md transition-all text-left"
        >
          <div>
            <div className="flex items-center gap-2 text-gray-900 font-bold mb-1"><Briefcase className="w-4 h-4" /> Manage workspaces</div>
            <div className="text-xs text-gray-500">Audit members and delete abandoned workspaces.</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

interface UsersProps {
  users: ProfileRow[];
  currentUserId: string | undefined;
  mutatingId: string | null;
  onToggleSuperAdmin: (u: ProfileRow) => void;
}
function UsersTable({ users, currentUserId, mutatingId, onToggleSuperAdmin }: UsersProps) {
  if (users.length === 0) {
    return <div className="py-16 text-center text-gray-400 text-sm">No users match your search.</div>;
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Last login</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
            <th className="px-5 py-3 w-44" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map(u => {
            const isSelf = u.id === currentUserId;
            const initials = (u.name || u.email).split(/[ @]/).map(s => s[0]).join('').toUpperCase().slice(0, 2);
            return (
              <tr key={u.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {u.name || u.email.split('@')[0]}
                        {isSelf && <span className="text-gray-400 font-normal ml-1">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {u.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <Crown className="w-3 h-3" /> Super admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Member
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onToggleSuperAdmin(u)}
                    disabled={mutatingId === u.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                      u.is_super_admin
                        ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {mutatingId === u.id ? '…' : u.is_super_admin ? 'Revoke admin' : 'Make super admin'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface WsProps {
  workspaces: WorkspaceWithMembers[];
  users: ProfileRow[];
  mutatingId: string | null;
  onDelete: (ws: WorkspaceRow) => void;
  onOpen: (ws: WorkspaceWithMembers) => void;
}
function WorkspacesTable({ workspaces, users, mutatingId, onDelete, onOpen }: WsProps) {
  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  if (workspaces.length === 0) {
    return <div className="py-16 text-center text-gray-400 text-sm">No workspaces match your search.</div>;
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Workspace</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Owner</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
            <th className="px-5 py-3 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {workspaces.map(ws => {
            const owner = ws.created_by ? userById.get(ws.created_by) : null;
            const count = ws.memberships?.length ?? 0;
            return (
              <tr key={ws.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3.5">
                  <button onClick={() => onOpen(ws)} className="flex items-center gap-3 text-left hover:opacity-80">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ws.color || '#625DF5' }}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{ws.name}</div>
                      {ws.description && <div className="text-xs text-gray-400 truncate max-w-xs">{ws.description}</div>}
                    </div>
                  </button>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                  {owner ? owner.name || owner.email : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{count}</td>
                <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                  {new Date(ws.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onDelete(ws)}
                    disabled={mutatingId === ws.id}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                    title="Delete workspace"
                  >
                    {mutatingId === ws.id ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
