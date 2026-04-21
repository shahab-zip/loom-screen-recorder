import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { AuthWorkspace, WorkspaceMembership, Invite, Role, WorkspaceSettings, Permission, User } from '../lib/auth-types';
import { DEFAULT_WORKSPACE_SETTINGS } from '../lib/auth-types';
import { hasPermission, canManageRole } from '../lib/permissions';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAuth } from './AuthContext';

interface WorkspaceState {
  workspaces: AuthWorkspace[];
  memberships: WorkspaceMembership[];
  invites: Invite[];
  currentWorkspaceId: string;
}

type WorkspaceAction =
  | { type: 'SET_WORKSPACES'; payload: AuthWorkspace[] }
  | { type: 'SET_MEMBERSHIPS'; payload: WorkspaceMembership[] }
  | { type: 'SET_INVITES'; payload: Invite[] }
  | { type: 'SET_CURRENT_WORKSPACE'; payload: string }
  | { type: 'HYDRATE'; payload: Partial<WorkspaceState> };

const initialState: WorkspaceState = {
  workspaces: [],
  memberships: [],
  invites: [],
  currentWorkspaceId: 'default',
};

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_WORKSPACES':
      return { ...state, workspaces: action.payload };
    case 'SET_MEMBERSHIPS':
      return { ...state, memberships: action.payload };
    case 'SET_INVITES':
      return { ...state, invites: action.payload };
    case 'SET_CURRENT_WORKSPACE':
      return { ...state, currentWorkspaceId: action.payload };
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  currentWorkspace: AuthWorkspace | null;
  currentRole: Role | null;

  // Workspace CRUD
  createWorkspace: (name: string, description: string, color: string) => AuthWorkspace;
  updateWorkspace: (id: string, data: Partial<Pick<AuthWorkspace, 'name' | 'description' | 'color'>>) => void;
  updateWorkspaceSettings: (id: string, settings: Partial<WorkspaceSettings>) => void;
  deleteWorkspace: (id: string) => boolean;
  switchWorkspace: (id: string) => void;

  // Membership
  getUserWorkspaces: () => AuthWorkspace[];
  getWorkspaceMembers: (workspaceId: string) => (WorkspaceMembership & { user?: User })[];
  getMemberRole: (userId: string, workspaceId: string) => Role | null;
  changeMemberRole: (userId: string, workspaceId: string, newRole: Role) => boolean;
  removeMember: (userId: string, workspaceId: string) => boolean;

  // Invites
  inviteMember: (email: string, role: Role) => Invite | null;
  cancelInvite: (inviteId: string) => void;
  acceptInvite: (inviteId: string) => boolean;
  getWorkspaceInvites: (workspaceId: string) => Invite[];

  // Permission check shortcut
  can: (permission: Permission) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Persist on change
  useEffect(() => {
    if (!authState.currentUser) return; // Don't persist before hydration
    setStorageItem('ws-workspaces', state.workspaces);
    setStorageItem('ws-memberships', state.memberships);
    setStorageItem('ws-invites', state.invites);
    setStorageItem('ws-current', state.currentWorkspaceId);
  }, [state, authState.currentUser]);

  // Hydrate on mount or user change
  useEffect(() => {
    if (!authState.currentUser) return;

    const workspaces = getStorageItem<AuthWorkspace[]>('ws-workspaces', []);
    const memberships = getStorageItem<WorkspaceMembership[]>('ws-memberships', []);
    const invites = getStorageItem<Invite[]>('ws-invites', []);
    const currentId = getStorageItem<string>('ws-current', 'default');

    // Ensure default workspace exists with this user as owner
    if (!workspaces.some(w => w.id === 'default')) {
      const defaultWs: AuthWorkspace = {
        id: 'default',
        name: 'My Workspace',
        description: 'Your personal workspace',
        color: '#625DF5',
        createdBy: authState.currentUser.id,
        createdAt: new Date().toISOString(),
        settings: { ...DEFAULT_WORKSPACE_SETTINGS },
      };
      workspaces.push(defaultWs);
    }

    // Ensure membership exists for current user in default workspace
    if (!memberships.some(m => m.userId === authState.currentUser!.id && m.workspaceId === 'default')) {
      memberships.push({
        userId: authState.currentUser.id,
        workspaceId: 'default',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        invitedBy: null,
        status: 'active',
      });
    }

    dispatch({
      type: 'HYDRATE',
      payload: { workspaces, memberships, invites, currentWorkspaceId: currentId },
    });
  }, [authState.currentUser]);

  const currentWorkspace = state.workspaces.find(w => w.id === state.currentWorkspaceId) || null;

  const currentRole = authState.currentUser
    ? (state.memberships.find(
        m => m.userId === authState.currentUser!.id && m.workspaceId === state.currentWorkspaceId && m.status === 'active'
      )?.role ?? null)
    : null;

  const can = useCallback((permission: Permission) => {
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  }, [currentRole]);

  const createWorkspace = useCallback((name: string, description: string, color: string) => {
    const userId = authState.currentUser!.id;
    const ws: AuthWorkspace = {
      id: `ws_${Date.now()}`,
      name,
      description,
      color,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      settings: { ...DEFAULT_WORKSPACE_SETTINGS },
    };
    const membership: WorkspaceMembership = {
      userId,
      workspaceId: ws.id,
      role: 'owner',
      joinedAt: ws.createdAt,
      invitedBy: null,
      status: 'active',
    };
    dispatch({ type: 'SET_WORKSPACES', payload: [...state.workspaces, ws] });
    dispatch({ type: 'SET_MEMBERSHIPS', payload: [...state.memberships, membership] });
    dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: ws.id });
    return ws;
  }, [authState.currentUser, state.workspaces, state.memberships]);

  const updateWorkspace = useCallback((id: string, data: Partial<Pick<AuthWorkspace, 'name' | 'description' | 'color'>>) => {
    dispatch({
      type: 'SET_WORKSPACES',
      payload: state.workspaces.map(w => w.id === id ? { ...w, ...data } : w),
    });
  }, [state.workspaces]);

  const updateWorkspaceSettings = useCallback((id: string, settings: Partial<WorkspaceSettings>) => {
    dispatch({
      type: 'SET_WORKSPACES',
      payload: state.workspaces.map(w =>
        w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w
      ),
    });
  }, [state.workspaces]);

  const deleteWorkspace = useCallback((id: string) => {
    if (id === 'default') return false;
    dispatch({ type: 'SET_WORKSPACES', payload: state.workspaces.filter(w => w.id !== id) });
    dispatch({ type: 'SET_MEMBERSHIPS', payload: state.memberships.filter(m => m.workspaceId !== id) });
    dispatch({ type: 'SET_INVITES', payload: state.invites.filter(i => i.workspaceId !== id) });
    if (state.currentWorkspaceId === id) {
      dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: 'default' });
    }
    return true;
  }, [state]);

  const switchWorkspace = useCallback((id: string) => {
    dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: id });
  }, []);

  const getUserWorkspaces = useCallback(() => {
    if (!authState.currentUser) return [];
    const userWsIds = state.memberships
      .filter(m => m.userId === authState.currentUser!.id && m.status === 'active')
      .map(m => m.workspaceId);
    return state.workspaces.filter(w => userWsIds.includes(w.id));
  }, [authState.currentUser, state.memberships, state.workspaces]);

  const getWorkspaceMembers = useCallback((workspaceId: string) => {
    const users = getStorageItem<User[]>('auth-users', []);
    return state.memberships
      .filter(m => m.workspaceId === workspaceId)
      .map(m => ({ ...m, user: users.find(u => u.id === m.userId) }));
  }, [state.memberships]);

  const getMemberRole = useCallback((userId: string, workspaceId: string) => {
    return state.memberships.find(
      m => m.userId === userId && m.workspaceId === workspaceId && m.status === 'active'
    )?.role ?? null;
  }, [state.memberships]);

  const changeMemberRole = useCallback((userId: string, workspaceId: string, newRole: Role) => {
    if (!currentRole || !canManageRole(currentRole, newRole)) return false;
    const targetMembership = state.memberships.find(
      m => m.userId === userId && m.workspaceId === workspaceId
    );
    if (!targetMembership || !canManageRole(currentRole, targetMembership.role)) return false;

    dispatch({
      type: 'SET_MEMBERSHIPS',
      payload: state.memberships.map(m =>
        m.userId === userId && m.workspaceId === workspaceId ? { ...m, role: newRole } : m
      ),
    });
    return true;
  }, [currentRole, state.memberships]);

  const removeMember = useCallback((userId: string, workspaceId: string) => {
    const targetMembership = state.memberships.find(
      m => m.userId === userId && m.workspaceId === workspaceId
    );
    if (!targetMembership || !currentRole || !canManageRole(currentRole, targetMembership.role)) return false;

    dispatch({
      type: 'SET_MEMBERSHIPS',
      payload: state.memberships.map(m =>
        m.userId === userId && m.workspaceId === workspaceId
          ? { ...m, status: 'deactivated' as const }
          : m
      ),
    });
    return true;
  }, [currentRole, state.memberships]);

  const inviteMember = useCallback((email: string, role: Role) => {
    if (!authState.currentUser || !can('member:invite')) return null;
    const invite: Invite = {
      id: `inv_${Date.now()}`,
      email: email.toLowerCase(),
      workspaceId: state.currentWorkspaceId,
      role,
      invitedBy: authState.currentUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    };
    dispatch({ type: 'SET_INVITES', payload: [...state.invites, invite] });
    return invite;
  }, [authState.currentUser, state.currentWorkspaceId, state.invites, can]);

  const cancelInvite = useCallback((inviteId: string) => {
    dispatch({
      type: 'SET_INVITES',
      payload: state.invites.filter(i => i.id !== inviteId),
    });
  }, [state.invites]);

  const acceptInvite = useCallback((inviteId: string) => {
    if (!authState.currentUser) return false;
    const invite = state.invites.find(i => i.id === inviteId && i.status === 'pending');
    if (!invite || invite.email !== authState.currentUser.email.toLowerCase()) return false;

    const membership: WorkspaceMembership = {
      userId: authState.currentUser.id,
      workspaceId: invite.workspaceId,
      role: invite.role,
      joinedAt: new Date().toISOString(),
      invitedBy: invite.invitedBy,
      status: 'active',
    };

    dispatch({ type: 'SET_MEMBERSHIPS', payload: [...state.memberships, membership] });
    dispatch({
      type: 'SET_INVITES',
      payload: state.invites.map(i => i.id === inviteId ? { ...i, status: 'accepted' as const } : i),
    });
    return true;
  }, [authState.currentUser, state.invites, state.memberships]);

  const getWorkspaceInvites = useCallback((workspaceId: string) => {
    return state.invites.filter(i => i.workspaceId === workspaceId && i.status === 'pending');
  }, [state.invites]);

  return (
    <WorkspaceContext.Provider value={{
      state,
      currentWorkspace,
      currentRole,
      createWorkspace,
      updateWorkspace,
      updateWorkspaceSettings,
      deleteWorkspace,
      switchWorkspace,
      getUserWorkspaces,
      getWorkspaceMembers,
      getMemberRole,
      changeMemberRole,
      removeMember,
      inviteMember,
      cancelInvite,
      acceptInvite,
      getWorkspaceInvites,
      can,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
