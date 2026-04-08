import { useState } from 'react';
import {
  Globe, Plus, Lock, Users, Video, MoreHorizontal,
  Search, Folder, X, Check, ChevronDown,
} from 'lucide-react';
import { getStorageItem, setStorageItem } from '../lib/storage';

interface Space {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  color: string;
  memberCount: number;
  videoCount: number;
  createdAt: string;
  isOwner: boolean;
}

const COLORS = ['#625DF5', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

const DEFAULT_SPACES: Space[] = [
  { id: '1', name: 'All My Workspace', description: 'All videos in your workspace', privacy: 'public', color: '#625DF5', memberCount: 3, videoCount: 12, createdAt: 'Jan 2024', isOwner: true },
  { id: '2', name: 'Product Updates', description: 'Product demos, changelogs, and release videos', privacy: 'public', color: '#EF4444', memberCount: 5, videoCount: 8, createdAt: 'Feb 2024', isOwner: true },
  { id: '3', name: 'Engineering', description: 'Technical walkthroughs and architecture reviews', privacy: 'private', color: '#10B981', memberCount: 4, videoCount: 6, createdAt: 'Feb 2024', isOwner: false },
  { id: '4', name: 'Onboarding', description: 'New hire training and orientation materials', privacy: 'public', color: '#F59E0B', memberCount: 8, videoCount: 15, createdAt: 'Mar 2024', isOwner: true },
  { id: '5', name: 'Design Reviews', description: 'UI/UX walkthroughs and feedback sessions', privacy: 'private', color: '#8B5CF6', memberCount: 3, videoCount: 4, createdAt: 'Apr 2024', isOwner: false },
];

export function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>(() =>
    getStorageItem<Space[]>('spaces-list', DEFAULT_SPACES)
  );
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivacy, setNewPrivacy] = useState<'public' | 'private'>('public');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    const space: Space = {
      id: Date.now().toString(),
      name: newName.trim(),
      description: newDesc.trim(),
      privacy: newPrivacy,
      color: newColor,
      memberCount: 1,
      videoCount: 0,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isOwner: true,
    };
    const updated = [...spaces, space];
    setSpaces(updated);
    setStorageItem('spaces-list', updated);
    setNewName('');
    setNewDesc('');
    setNewPrivacy('public');
    setNewColor(COLORS[0]);
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this space? This cannot be undone.')) return;
    const updated = spaces.filter(s => s.id !== id);
    setSpaces(updated);
    setStorageItem('spaces-list', updated);
    setOpenMenuId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Navigation</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Spaces</h1>
            <p className="text-sm text-gray-500 mt-1">Organise videos by team, project, or topic</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New space
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total spaces', value: spaces.length },
            { label: 'Public spaces', value: spaces.filter(s => s.privacy === 'public').length },
            { label: 'Private spaces', value: spaces.filter(s => s.privacy === 'private').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-2xl font-black text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search spaces…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
          />
        </div>

        {/* Spaces grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(space => (
            <div key={space.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              {/* Color strip */}
              <div className="h-2" style={{ backgroundColor: space.color }} />

              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
                      style={{ backgroundColor: space.color }}
                    >
                      {space.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{space.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {space.privacy === 'private'
                          ? <Lock className="w-3 h-3" />
                          : <Globe className="w-3 h-3" />
                        }
                        {space.privacy === 'private' ? 'Private' : 'Public'}
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === space.id ? null : space.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {openMenuId === space.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 w-36 overflow-hidden">
                          <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700">Open</button>
                          {space.isOwner && (
                            <>
                              <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700">Edit</button>
                              <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700">Invite</button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleDelete(space.id)}
                                className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {space.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{space.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>{space.videoCount} videos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{space.memberCount} members</span>
                  </div>
                  <div className="ml-auto text-[11px]">{space.createdAt}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="col-span-3 py-20 flex flex-col items-center text-center text-gray-400">
              <Folder className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-semibold text-gray-500">No spaces found</p>
              <p className="text-sm mt-1">Try a different search or create a new space</p>
            </div>
          )}
        </div>
      </div>

      {/* Create space modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Create a space</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                  style={{ backgroundColor: newColor }}
                >
                  {newName ? newName.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{newName || 'Space name'}</div>
                  <div className="text-xs text-gray-400">{newPrivacy === 'private' ? '🔒 Private' : '🌐 Public'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Space name</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Marketing…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="What's this space for?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: 'public', label: 'Public', desc: 'Anyone in workspace', icon: Globe },
                    { val: 'private', label: 'Private', desc: 'Invite only', icon: Lock },
                  ] as const).map(({ val, label, desc, icon: Icon }) => (
                    <button
                      key={val}
                      onClick={() => setNewPrivacy(val)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${newPrivacy === val ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${newPrivacy === val ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-xs font-semibold ${newPrivacy === val ? 'text-red-700' : 'text-gray-700'}`}>{label}</div>
                        <div className="text-[10px] text-gray-400">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Create space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
