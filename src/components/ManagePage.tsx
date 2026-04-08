import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Search, MoreHorizontal, Shield, Crown,
  Eye, Trash2, Check, X, Mail, ChevronDown, Filter,
} from 'lucide-react';

type Role = 'Owner' | 'Admin' | 'Member' | 'Viewer';
type Status = 'Active' | 'Pending' | 'Deactivated';

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  avatar: string;
  joinedAt: string;
  lastSeen: string;
  videosCreated: number;
}

const ROLE_COLORS: Record<Role, string> = {
  Owner:  'bg-violet-100 text-violet-700',
  Admin:  'bg-blue-100 text-blue-700',
  Member: 'bg-green-100 text-green-700',
  Viewer: 'bg-gray-100 text-gray-600',
};

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  Owner:  Crown,
  Admin:  Shield,
  Member: Users,
  Viewer: Eye,
};

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'You', email: 'you@company.com', role: 'Owner', status: 'Active', avatar: 'YO', joinedAt: 'Jan 1, 2024', lastSeen: 'Just now', videosCreated: 42 },
  { id: '2', name: 'Alex Rivera', email: 'alex@company.com', role: 'Admin', status: 'Active', avatar: 'AR', joinedAt: 'Feb 14, 2024', lastSeen: '2h ago', videosCreated: 28 },
  { id: '3', name: 'Jordan Kim', email: 'jordan@company.com', role: 'Member', status: 'Active', avatar: 'JK', joinedAt: 'Mar 5, 2024', lastSeen: '1d ago', videosCreated: 15 },
  { id: '4', name: 'Sam Chen', email: 'sam@company.com', role: 'Member', status: 'Pending', avatar: 'SC', joinedAt: '—', lastSeen: 'Never', videosCreated: 0 },
  { id: '5', name: 'Morgan Lee', email: 'morgan@company.com', role: 'Viewer', status: 'Active', avatar: 'ML', joinedAt: 'Apr 20, 2024', lastSeen: '3d ago', videosCreated: 0 },
];

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
];

export function ManagePage() {
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Member');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'All' || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  const handleRoleChange = (id: string, role: Role) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    setOpenMenuId(null);
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this member from the workspace?')) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
    setOpenMenuId(null);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    const newMember: Member = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Pending',
      avatar: inviteEmail.slice(0, 2).toUpperCase(),
      joinedAt: '—',
      lastSeen: 'Never',
      videosCreated: 0,
    };
    setMembers(prev => [...prev, newMember]);
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteEmail('');
      setShowInviteModal(false);
    }, 1500);
  };

  const counts = {
    total: members.length,
    active: members.filter(m => m.status === 'Active').length,
    pending: members.filter(m => m.status === 'Pending').length,
  };

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
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            Invite member
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total members', value: counts.total, color: 'text-gray-900' },
            { label: 'Active', value: counts.active, color: 'text-green-600' },
            { label: 'Pending invite', value: counts.pending, color: 'text-yellow-600' },
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
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as Role | 'All')}
              className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 bg-white appearance-none"
            >
              <option value="All">All roles</option>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Last seen</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Videos</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((member, idx) => {
                const RoleIcon = ROLE_ICONS[member.role];
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {member.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[member.role]}`}>
                        <RoleIcon className="w-3 h-3" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        member.status === 'Active' ? 'text-green-600' :
                        member.status === 'Pending' ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'Active' ? 'bg-green-500' :
                          member.status === 'Pending' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                        }`} />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">{member.lastSeen}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">{member.videosCreated}</td>
                    <td className="px-5 py-3.5 relative">
                      {member.role !== 'Owner' && (
                        <>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                          {openMenuId === member.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 w-44 overflow-hidden">
                                <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change role</div>
                                {(['Admin', 'Member', 'Viewer'] as Role[]).map(role => (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleChange(member.id, role)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-left"
                                  >
                                    <span>{role}</span>
                                    {member.role === role && <Check className="w-3.5 h-3.5 text-red-600" />}
                                  </button>
                                ))}
                                <div className="border-t border-gray-100 mt-1 pt-1">
                                  <button
                                    onClick={() => handleRemove(member.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </button>
                                </div>
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
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Invite a team member</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 appearance-none bg-white pr-8"
                  >
                    <option value="Admin">Admin — can manage members</option>
                    <option value="Member">Member — can record and share</option>
                    <option value="Viewer">Viewer — can only watch</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.includes('@') || inviteSent}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {inviteSent ? <><Check className="w-4 h-4" /> Sent!</> : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
