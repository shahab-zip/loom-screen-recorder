import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Users, Video, Check, Briefcase, FolderOpen, X } from 'lucide-react';
import type { Video as VideoType } from '../App';
import { RequirePermission } from './auth/RequirePermission';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  videoCount: number;
  memberCount: number;
}

interface WorkspacesProps {
  onNewVideo: () => void;
  currentWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  videos?: VideoType[];
}

export function Workspaces({ onNewVideo, currentWorkspaceId, onWorkspaceChange, videos }: WorkspacesProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    color: '#EF4444'
  });

  const colors = [
    { value: '#EF4444', label: 'Red' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#10B981', label: 'Green' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('workspaces');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWorkspaces(parsed.map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) })));
    } else {
      // Create default workspace
      const defaultWorkspace: Workspace = {
        id: 'default',
        name: 'My Workspace',
        color: '#EF4444',
        createdAt: new Date(),
        videoCount: 0,
        memberCount: 1
      };
      setWorkspaces([defaultWorkspace]);
      localStorage.setItem('workspaces', JSON.stringify([defaultWorkspace]));
    }
  }, []);

  const saveWorkspaces = (updated: Workspace[]) => {
    setWorkspaces(updated);
    localStorage.setItem('workspaces', JSON.stringify(updated));
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) {
      alert('Please enter a workspace name');
      return;
    }

    const workspace: Workspace = {
      id: Date.now().toString(),
      name: newWorkspace.name.trim(),
      color: newWorkspace.color,
      createdAt: new Date(),
      videoCount: 0,
      memberCount: 1
    };

    saveWorkspaces([...workspaces, workspace]);
    setShowCreateModal(false);
    setNewWorkspace({ name: '', color: '#EF4444' });
  };

  const handleDeleteWorkspace = (id: string) => {
    if (id === 'default') {
      alert('Cannot delete the default workspace');
      return;
    }

    if (confirm('Delete this workspace? All videos will be moved to the default workspace.')) {
      saveWorkspaces(workspaces.filter(w => w.id !== id));
      if (currentWorkspaceId === id) {
        onWorkspaceChange('default');
      }
      setOpenMenuId(null);
    }
  };

  const handleRenameWorkspace = (id: string, newName: string) => {
    if (!newName.trim()) return;
    saveWorkspaces(workspaces.map(w => w.id === id ? { ...w, name: newName.trim() } : w));
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white animate-fade-in">
      {/* Header */}
      <header className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-gray-400 mb-2 tracking-widest" style={{ fontWeight: 600 }}>ORGANIZATION</div>
            <h1 className="text-5xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>WORKSPACES</h1>
          </div>
          <RequirePermission permission="workspace:create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-white shadow-lg hover:shadow-xl hover:scale-105 group"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-sm">New workspace</span>
            </button>
          </RequirePermission>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Organize your videos across different workspaces • {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace, index) => (
            <div
              key={workspace.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${workspace.color}20` }}
                >
                  <Briefcase className="w-6 h-6" style={{ color: workspace.color }} />
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === workspace.id ? null : workspace.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  {openMenuId === workspace.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 animate-scale-in">
                        <button
                          onClick={() => {
                            setEditingId(workspace.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700"
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </button>
                        {workspace.id !== 'default' && (
                          <button
                            onClick={() => handleDeleteWorkspace(workspace.id)}
                            className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-sm text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {editingId === workspace.id ? (
                <input
                  type="text"
                  defaultValue={workspace.name}
                  onBlur={(e) => handleRenameWorkspace(workspace.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameWorkspace(workspace.id, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="w-full px-3 py-2 border-2 border-red-500 rounded-lg focus:outline-none text-lg mb-4"
                  style={{ fontWeight: 600 }}
                />
              ) : (
                <h3 className="text-lg mb-1 text-gray-900 truncate" style={{ fontWeight: 600 }}>
                  {workspace.name}
                </h3>
              )}

              <p className="text-xs text-gray-500 mb-6">
                Created {workspace.createdAt.toLocaleDateString()}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Video className="w-4 h-4" />
                    <span>Videos</span>
                  </div>
                  <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                    {workspace.videoCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Members</span>
                  </div>
                  <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                    {workspace.memberCount}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onWorkspaceChange(workspace.id);
                  // Navigate to library view to see workspace videos
                }}
                className={`w-full py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  currentWorkspaceId === workspace.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ fontWeight: 600 }}
              >
                {currentWorkspaceId === workspace.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Active</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm">Switch to</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl text-gray-900" style={{ fontWeight: 700 }}>Create Workspace</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-400"
                  placeholder="e.g., Marketing Team"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-3" style={{ fontWeight: 600 }}>
                  Workspace Color
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {colors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewWorkspace({ ...newWorkspace, color: color.value })}
                      className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${
                        newWorkspace.color === color.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    💡
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 mb-1" style={{ fontWeight: 600 }}>Pro Tip</div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      Use workspaces to organize videos by project, team, or client. Each workspace maintains its own video library.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white shadow-lg hover:shadow-xl hover:scale-105"
                style={{ fontWeight: 600 }}
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}