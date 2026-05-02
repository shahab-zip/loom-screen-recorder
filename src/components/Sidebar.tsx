import {
  Home, Video, Clock, History, Settings, Calendar, ChevronDown,
  Users, Plus, PanelLeftClose, PanelLeftOpen, Monitor, CreditCard,
  ExternalLink, Globe, ChevronRight, UserPlus, Briefcase, LogOut, Shield,
} from 'lucide-react';
import { useState, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
import { RequirePermission } from './auth/RequirePermission';
import { InviteModal } from './auth/InviteModal';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/auth-types';
import type { CurrentView } from '../lib/types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: CurrentView) => void;
  currentWorkspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
  /** Controlled collapse state. If provided, sidebar becomes a controlled component. */
  collapsed?: boolean;
  /** Called when the user clicks the collapse/expand toggle (controlled mode). */
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar = memo(function Sidebar({
  currentView,
  onViewChange,
  currentWorkspaceId,
  onWorkspaceChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isControlled = collapsed !== undefined;
  const isCollapsed = isControlled ? collapsed : internalCollapsed;
  const setIsCollapsed = (next: boolean) => {
    if (isControlled) onCollapsedChange?.(next);
    else setInternalCollapsed(next);
  };
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [manageExpanded, setManageExpanded] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { state: authState, logout } = useAuth();
  const isSuperAdmin = authState.currentUser?.isSuperAdmin ?? false;
  const { currentWorkspace, currentRole, getUserWorkspaces, switchWorkspace, createWorkspace } = useWorkspace();

  const userName = authState.currentUser?.name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userWorkspaces = getUserWorkspaces();

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    createWorkspace(newWorkspaceName.trim(), '', '#625DF5');
    setNewWorkspaceName('');
    setShowCreateWorkspace(false);
  };

  const handleSwitchWorkspace = (id: string) => {
    switchWorkspace(id);
    onWorkspaceChange(id);
    setShowWorkspaceDropdown(false);
  };

  const mainNav = [
    { id: 'for-you' as CurrentView,    label: 'For you',         icon: Home },
    { id: 'library' as CurrentView,    label: 'Library',         icon: Video },
    { id: 'meetings' as CurrentView,   label: 'Meetings',        icon: Calendar },
    { id: 'watch-later' as CurrentView,label: 'Watch later',     icon: Clock },
    { id: 'history' as CurrentView,    label: 'Recent',          icon: History },
    { id: 'settings' as CurrentView,   label: 'Personal settings', icon: Settings },
  ];

  const NavItem = ({
    id, label, icon: Icon, indent = false, external = false,
    onClick, badge,
  }: {
    id?: CurrentView; label: string; icon: React.ComponentType<{ className?: string }>;
    indent?: boolean; external?: boolean; onClick?: () => void; badge?: string;
  }) => {
    const isActive = id && currentView === id;
    const handleClick = onClick ?? (id ? () => onViewChange(id) : undefined);

    return (
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-3 rounded-lg transition-all duration-150 group
          ${isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2'}
          ${isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
          ${indent && !isCollapsed ? 'pl-8' : ''}
        `}
        title={isCollapsed ? label : undefined}
      >
        {indent && !isCollapsed && (
          <span className="w-px h-4 bg-gray-300 ml-1 mr-1 flex-shrink-0" />
        )}
        <Icon className={`flex-shrink-0 transition-colors ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`} />
        {!isCollapsed && (
          <>
            <span className={`text-sm flex-1 text-left truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {label}
            </span>
            {external && <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            {badge && (
              <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const wsColor = currentWorkspace?.color || '#625DF5';
  const wsName = currentWorkspace?.name || 'My Workspace';

  return (
    <>
      <aside
        className={`
          flex flex-col bg-white border-r border-gray-200 h-full transition-all duration-300 ease-in-out flex-shrink-0
          ${isCollapsed ? 'w-[60px]' : 'w-64'}
        `}
      >
        {/* Logo & collapse button */}
        <div className={`flex items-center border-b border-gray-100 flex-shrink-0 ${isCollapsed ? 'flex-col gap-3 py-4 px-2' : 'justify-between px-4 py-3'}`}>
          {!isCollapsed && (
            <button
              onClick={() => onViewChange('for-you' as CurrentView)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="text-base font-bold text-gray-900 tracking-tight">Loom</span>
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={() => onViewChange('for-you' as CurrentView)}
              className="hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Workspace selector */}
          {!isCollapsed && (
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <button
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${showWorkspaceDropdown ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: wsColor }}
                  >
                    {wsName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                      {wsName}
                      {currentRole && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[currentRole]}`}>
                          {ROLE_LABELS[currentRole]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{userWorkspaces.length} workspace{userWorkspaces.length !== 1 ? 's' : ''}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showWorkspaceDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                      <div className="p-1.5 max-h-48 overflow-y-auto">
                        {userWorkspaces.map(ws => (
                          <button
                            key={ws.id}
                            onClick={() => handleSwitchWorkspace(ws.id)}
                            className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-colors text-left ${ws.id === currentWorkspaceId ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ws.color }}>
                              {ws.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{ws.name}</div>
                            </div>
                            {ws.id === currentWorkspaceId && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 p-1.5">
                        <RequirePermission permission="workspace:create">
                          <button
                            onClick={() => { setShowCreateWorkspace(true); setShowWorkspaceDropdown(false); }}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">New workspace</span>
                          </button>
                        </RequirePermission>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Invite teammates */}
              <RoleGuard permission="member:invite">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full flex items-center gap-2 mt-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Invite teammates</span>
                </button>
              </RoleGuard>
            </div>
          )}

          {/* Collapsed workspace avatar */}
          {isCollapsed && (
            <div className="px-2 pt-2 pb-1 flex flex-col items-center gap-1">
              <button
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: wsColor }}
                title={wsName}
              >
                {wsName.charAt(0).toUpperCase()}
              </button>
            </div>
          )}

          {/* Main navigation */}
          <nav className={`px-2 pt-1 pb-2 space-y-0.5`}>
            {mainNav.map(item => (
              <NavItem key={item.id} {...item} />
            ))}
          </nav>

          {/* Admin tools section - gated by permission */}
          {!isCollapsed && (
            <>
              <RoleGuard permission="workspace:view-settings">
                <div className="px-4 py-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Admin tools</span>
                </div>
                <nav className="px-2 pb-2 space-y-0.5">
                  {/* Manage (expandable) */}
                  <RequirePermission permission="member:view">
                    <button
                      onClick={() => setManageExpanded(!manageExpanded)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900 group"
                    >
                      <Monitor className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium flex-1 text-left">Manage</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${manageExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {manageExpanded && (
                      <NavItem
                        id={'manage' as CurrentView}
                        label="Users"
                        icon={Users}
                        indent
                      />
                    )}
                  </RequirePermission>
                  <RequirePermission permission="workspace:view-settings">
                    <NavItem id={'workspace-settings' as CurrentView} label="Workspace" icon={Briefcase} />
                  </RequirePermission>
                  <RequirePermission permission="workspace:view-billing">
                    <NavItem id={'billing' as CurrentView} label="Billing" icon={CreditCard} external />
                  </RequirePermission>
                  {isSuperAdmin && (
                    <NavItem id={'super-admin' as CurrentView} label="Super admin" icon={Shield} />
                  )}
                </nav>
              </RoleGuard>

              {/* Spaces section */}
              <RequirePermission permission="space:create">
                <div className="px-4 pt-2 pb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Spaces</span>
                  <button className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded transition-colors" title="New space">
                    <Plus className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </RequirePermission>
              <nav className="px-2 pb-2 space-y-0.5">
                <RequirePermission permission="space:create">
                  <NavItem id={'spaces' as CurrentView} label="View all spaces" icon={Globe} />
                </RequirePermission>
                <button
                  onClick={() => onViewChange('library' as CurrentView)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group text-gray-600 hover:bg-gray-50 hover:text-gray-900`}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: wsColor }}
                  >
                    {wsName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">All {wsName}</span>
                </button>
              </nav>

              {/* User profile at bottom */}
              <div className="mt-auto border-t border-gray-100 px-3 py-3">
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                      <div className="text-xs text-gray-400 truncate">{authState.currentUser?.email}</div>
                    </div>
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden py-1">
                        <button
                          onClick={() => { onViewChange('settings' as CurrentView); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Profile settings
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { logout(); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Collapsed: show icons for admin tools */}
          {isCollapsed && (
            <nav className="px-2 pt-1 pb-4 space-y-0.5 border-t border-gray-100 mt-1">
              <RequirePermission permission="workspace:view-settings">
                <NavItem label="Workspace" icon={Briefcase} onClick={() => onViewChange('workspace-settings' as CurrentView)} />
              </RequirePermission>
              <RequirePermission permission="workspace:view-billing">
                <NavItem label="Billing" icon={CreditCard} onClick={() => onViewChange('billing' as CurrentView)} />
              </RequirePermission>
            </nav>
          )}
        </div>
      </aside>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Create Workspace</h2>
              <p className="text-sm text-gray-500 mt-0.5">Organize your team's recordings</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace name</label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                  if (e.key === 'Escape') setShowCreateWorkspace(false);
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Marketing Team"
                autoFocus
              />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { setShowCreateWorkspace(false); setNewWorkspaceName(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-semibold text-white transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </>
  );
});
