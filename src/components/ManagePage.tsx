import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Search, MoreHorizontal, Shield, Crown,
  Eye, Trash2, Check, X, Filter,
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { InviteMemberModal } from './InviteMemberModal';
import { InviteListPanel } from './InviteListPanel';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/auth-types';
import { getAssignableRoles, canManageRole } from '../lib/permissions';
import type { Role } from '../lib/auth-types';

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
];

export function ManagePage() {
  const { getWorkspaceMembers, changeMemberRole, removeMember, currentRole, state: wsState, can } = useWorkspace();
  const { state: authState } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inviteRefresh, setInviteRefresh] = useState(0);

  const members = getWorkspaceMembers(wsState.currentWorkspaceId);

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (m.status === 'deactivated') return false;
      const matchSearch = (m.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.user?.email || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  const handleRoleChange = (userId: string, newRole: Role) => {
    changeMemberRole(userId, wsState.currentWorkspaceId, newRole);
    setOpenMenuId(null);
  };

  const handleRemove = (userId: string) => {
    if (confirm('Remove this member from the workspace?')) {
      removeMember(userId, wsState.currentWorkspaceId);
    }
    setOpenMenuId(null);
  };

  const counts = {
    total: members.filter(m => m.status !== 'deactivated').length,
    active: members.filter(m => m.status === 'active').length,
  };

  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Admin Tools</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Users</h1>
            <p className="text-sm text-gray-500 mt-1">Control who has access to your workspace</p>
          </div>
          <div className="flex items-center gap-2">
            {can('member:invite') && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Invite member
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total members', value: counts.total, color: 'text-gray-900' },
            { label: 'Active', value: counts.active, color: 'text-green-600' },
            // TODO: fetch real invite count; InviteListPanel below shows accurate list
            { label: 'Pending invite', value: '—' as string | number, color: 'text-yellow-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as Role | 'all')}
              className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white appearance-none"
            >
              <option value="all">All roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((member, idx) => {
                const RoleIcon = ROLE_ICONS[member.role];
                const memberName = member.user?.name || 'Unknown';
                const memberEmail = member.user?.email || '';
                const initials = memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const isCurrentUser = member.userId === authState.currentUser?.id;
                const canManage = currentRole && member.role !== 'owner' && canManageRole(currentRole, member.role);

                return (
                  <tr key={member.userId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {memberName} {isCurrentUser && <span className="text-gray-400 font-normal">(you)</span>}
                          </div>
                          <div className="text-xs text-gray-400">{memberEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[member.role]}`}>
                        <RoleIcon className="w-3 h-3" />
                        {ROLE_LABELS[member.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        member.status === 'active' ? 'text-green-600' :
                        member.status === 'pending' ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'active' ? 'bg-green-500' :
                          member.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                        }`} />
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 relative">
                      {canManage && !isCurrentUser && can('member:change-role') && (
                        <>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === member.userId ? null : member.userId)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                          {openMenuId === member.userId && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 w-44 overflow-hidden">
                                <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change role</div>
                                {assignableRoles.map(role => (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleChange(member.userId, role)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-left"
                                  >
                                    <span>{ROLE_LABELS[role]}</span>
                                    {member.role === role && <Check className="w-3.5 h-3.5 text-red-600" />}
                                  </button>
                                ))}
                                {can('member:remove') && (
                                  <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button
                                      onClick={() => handleRemove(member.userId)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No members found</p>
            </div>
          )}
        </div>

        {/* Pending Invites */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Pending Invites</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            {wsState.currentWorkspaceId && <InviteListPanel workspaceId={wsState.currentWorkspaceId} refreshKey={inviteRefresh} />}
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInviteModal && wsState.currentWorkspaceId && (
        <InviteMemberModal
          workspaceId={wsState.currentWorkspaceId}
          onClose={() => setShowInviteModal(false)}
          onCreated={() => setInviteRefresh(k => k + 1)}
        />
      )}
    </div>
  );
}
