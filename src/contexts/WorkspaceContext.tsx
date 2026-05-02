import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { AuthWorkspace, WorkspaceMembership, Invite, Role, WorkspaceSettings, Permission, User } from '../lib/auth-types';
import { DEFAULT_WORKSPACE_SETTINGS } from '../lib/auth-types';
import { hasPermission, canManageRole } from '../lib/permissions';
import { useAuth } from './AuthContext';
import { workspacesRepo } from '../lib/repos/workspaces';
import { membershipsRepo } from '../lib/repos/memberships';
import { invitesRepo } from '../lib/repos/invites';
import type { WorkspaceRow } from '../lib/repos/workspaces';
import type { MembershipRow } from '../lib/repos/memberships';
import type { InviteRow } from '../lib/repos/invites';

// ---------------------------------------------------------------------------
// Row → Domain converters
// ---------------------------------------------------------------------------

function toAuthWorkspace(row: WorkspaceRow): AuthWorkspace {
  const rawSettings = row.settings as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    color: row.color ?? '#625DF5',
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    settings: {
      defaultVideoPrivacy:
        (rawSettings?.defaultVideoPrivacy as WorkspaceSettings['defaultVideoPrivacy']) ??
        DEFAULT_WORKSPACE_SETTINGS.defaultVideoPrivacy,
      allowGuestViewing:
        (rawSettings?.allowGuestViewing as boolean) ?? DEFAULT_WORKSPACE_SETTINGS.allowGuestViewing,
      requireApproval:
        (rawSettings?.requireApproval as boolean) ?? DEFAULT_WORKSPACE_SETTINGS.requireApproval,
      allowDownloads:
        (rawSettings?.allowDownloads as boolean) ?? DEFAULT_WORKSPACE_SETTINGS.allowDownloads,
    },
  };
}

function toWorkspaceMembership(row: MembershipRow): WorkspaceMembership {
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    role: row.role,
    joinedAt: row.joined_at,
    invitedBy: row.invited_by,
    status: row.status,
  };
}

function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    email: row.email,
    workspaceId: row.workspace_id,
    role: row.role,
    invitedBy: row.invited_by ?? '',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.status === 'revoked' ? 'expired' : row.status,
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface WorkspaceState {
  workspaces: AuthWorkspace[];
  memberships: WorkspaceMembership[];
  invites: Invite[];
  currentWorkspaceId: string;
  /** Members for the current workspace (all, not just current user's). */
  allMembers: (WorkspaceMembership & { user?: User })[];
}

type WorkspaceAction =
  | { type: 'SET_WORKSPACES'; payload: AuthWorkspace[] }
  | { type: 'SET_MEMBERSHIPS'; payload: WorkspaceMembership[] }
  | { type: 'SET_INVITES'; payload: Invite[] }
  | { type: 'SET_CURRENT_WORKSPACE'; payload: string }
  | { type: 'SET_ALL_MEMBERS'; payload: (WorkspaceMembership & { user?: User })[] }
  | { type: 'HYDRATE'; payload: Partial<WorkspaceState> };

const initialState: WorkspaceState = {
  workspaces: [],
  memberships: [],
  invites: [],
  currentWorkspaceId: '',
  allMembers: [],
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
    case 'SET_ALL_MEMBERS':
      return { ...state, allMembers: action.payload };
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context interface (preserves existing public API)
// ---------------------------------------------------------------------------

interface WorkspaceContextValue {
  state: WorkspaceState;
  currentWorkspace: AuthWorkspace | null;
  currentRole: Role | null;

  // Workspace CRUD
  createWorkspace: (name: string, description: string, color: string) => Promise<AuthWorkspace | null>;
  updateWorkspace: (id: string, data: Partial<Pick<AuthWorkspace, 'name' | 'description' | 'color'>>) => Promise<void>;
  updateWorkspaceSettings: (id: string, settings: Partial<WorkspaceSettings>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  switchWorkspace: (id: string) => void;

  // Membership
  getUserWorkspaces: () => AuthWorkspace[];
  getWorkspaceMembers: (workspaceId: string) => (WorkspaceMembership & { user?: User })[];
  getMemberRole: (userId: string, workspaceId: string) => Role | null;
  changeMemberRole: (userId: string, workspaceId: string, newRole: Role) => Promise<boolean>;
  removeMember: (userId: string, workspaceId: string) => Promise<boolean>;

  // Invites
  inviteMember: (email: string, role: Role) => Promise<Invite | null>;
  cancelInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => boolean;
  getWorkspaceInvites: (workspaceId: string) => Invite[];

  // Direct member add
  addMemberToWorkspace: (userId: string, workspaceId: string, role: Role) => Promise<void>;

  // Permission check shortcut
  can: (permission: Permission) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Use a ref so callbacks can access currentWorkspaceId without stale closure
  const currentWorkspaceIdRef = useRef(state.currentWorkspaceId);
  currentWorkspaceIdRef.current = state.currentWorkspaceId;

  // ---------------------------------------------------------------------------
  // Data loading helpers
  // ---------------------------------------------------------------------------

  async function refreshWorkspaces(userId: string) {
    const { data: wsRows } = await workspacesRepo.listMine();
    const workspaces = (wsRows ?? []).map(toAuthWorkspace);
    dispatch({ type: 'SET_WORKSPACES', payload: workspaces });
    return workspaces;
  }

  async function refreshMemberships(userId: string) {
    const { data: memRows } = await membershipsRepo.listForUser(userId);
    const memberships = (memRows ?? []).map(row => toWorkspaceMembership(row as MembershipRow));
    dispatch({ type: 'SET_MEMBERSHIPS', payload: memberships });
    return memberships;
  }

  async function refreshInvites(workspaceId: string) {
    if (!workspaceId) return;
    const { data: invRows } = await invitesRepo.listByWorkspace(workspaceId);
    const invites = (invRows ?? []).map(row => toInvite(row as InviteRow));
    dispatch({ type: 'SET_INVITES', payload: invites });
  }

  async function refreshAllMembers(workspaceId: string) {
    if (!workspaceId) return;
    const { data: rows } = await membershipsRepo.listByWorkspace(workspaceId);
    if (!rows) return;

    // The join includes a `profiles` sub-object on each row
    const members = (rows as (MembershipRow & { profiles?: { id: string; name: string; email: string; avatar: string } | null })[]).map(row => {
      const membership = toWorkspaceMembership(row);
      const profile = row.profiles;
      const user: User | undefined = profile
        ? { id: profile.id, name: profile.name, email: profile.email, avatar: profile.avatar ?? '', createdAt: '', lastLoginAt: '' }
        : undefined;
      return { ...membership, user };
    });

    dispatch({ type: 'SET_ALL_MEMBERS', payload: members });
  }

  async function fullRefresh(userId: string, wsId: string) {
    await Promise.all([
      refreshWorkspaces(userId),
      refreshMemberships(userId),
      refreshInvites(wsId),
      refreshAllMembers(wsId),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Hydrate when the authenticated user changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authState.currentUser) {
      dispatch({ type: 'HYDRATE', payload: initialState });
      return;
    }

    const userId = authState.currentUser.id;

    (async () => {
      const [wsResult, memResult] = await Promise.all([
        workspacesRepo.listMine(),
        membershipsRepo.listForUser(userId),
      ]);

      const workspaces = (wsResult.data ?? []).map(toAuthWorkspace);
      const memberships = (memResult.data ?? []).map(row => toWorkspaceMembership(row as MembershipRow));

      // Default to first workspace if available
      const firstWsId = workspaces[0]?.id ?? '';

      dispatch({
        type: 'HYDRATE',
        payload: { workspaces, memberships, currentWorkspaceId: firstWsId, invites: [], allMembers: [] },
      });

      // Load per-workspace data for the first workspace
      if (firstWsId) {
        await Promise.all([
          refreshInvites(firstWsId),
          refreshAllMembers(firstWsId),
        ]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.currentUser?.id]);

  // When current workspace changes, reload its invites and members
  useEffect(() => {
    if (!state.currentWorkspaceId || !authState.currentUser) return;
    refreshInvites(state.currentWorkspaceId);
    refreshAllMembers(state.currentWorkspaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentWorkspaceId]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const currentWorkspace = state.workspaces.find(w => w.id === state.currentWorkspaceId) || null;

  const currentRole = authState.currentUser
    ? (state.memberships.find(
        m => m.userId === authState.currentUser!.id &&
             m.workspaceId === state.currentWorkspaceId &&
             m.status === 'active'
      )?.role ?? null)
    : null;

  const can = useCallback((permission: Permission) => {
    if (authState.currentUser?.isSuperAdmin) return true;
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  }, [currentRole, authState.currentUser?.isSuperAdmin]);

  // ---------------------------------------------------------------------------
  // Workspace CRUD
  // ---------------------------------------------------------------------------

  const createWorkspace = useCallback(async (name: string, description: string, color: string): Promise<AuthWorkspace | null> => {
    // Permission guard: viewers cannot create workspaces. Super admins bypass.
    const isSuper = authState.currentUser?.isSuperAdmin ?? false;
    if (!isSuper) {
      if (!currentRole || !hasPermission(currentRole, 'workspace:create')) {
        return null;
      }
    }

    const { data, error } = await workspacesRepo.create({ name, description, color });
    if (error || !data) return null;
    const ws = toAuthWorkspace(data);

    if (authState.currentUser) {
      await refreshWorkspaces(authState.currentUser.id);
      await refreshMemberships(authState.currentUser.id);
    }

    dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: ws.id });
    return ws;
  }, [authState.currentUser, currentRole]);

  const updateWorkspace = useCallback(async (id: string, data: Partial<Pick<AuthWorkspace, 'name' | 'description' | 'color'>>) => {
    await workspacesRepo.update(id, data);
    if (authState.currentUser) await refreshWorkspaces(authState.currentUser.id);
  }, [authState.currentUser]);

  const updateWorkspaceSettings = useCallback(async (id: string, settings: Partial<WorkspaceSettings>) => {
    const ws = state.workspaces.find(w => w.id === id);
    const merged = { ...(ws?.settings ?? DEFAULT_WORKSPACE_SETTINGS), ...settings };
    await workspacesRepo.update(id, { settings: merged as unknown as Record<string, unknown> });
    if (authState.currentUser) await refreshWorkspaces(authState.currentUser.id);
  }, [authState.currentUser, state.workspaces]);

  const deleteWorkspace = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await workspacesRepo.remove(id);
    if (error) return false;

    if (authState.currentUser) {
      await refreshWorkspaces(authState.currentUser.id);
      await refreshMemberships(authState.currentUser.id);
    }

    if (state.currentWorkspaceId === id) {
      const remaining = state.workspaces.filter(w => w.id !== id);
      dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: remaining[0]?.id ?? '' });
    }

    return true;
  }, [authState.currentUser, state.currentWorkspaceId, state.workspaces]);

  const switchWorkspace = useCallback((id: string) => {
    dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: id });
  }, []);

  // ---------------------------------------------------------------------------
  // Membership
  // ---------------------------------------------------------------------------

  const getUserWorkspaces = useCallback(() => {
    if (!authState.currentUser) return [];
    const userWsIds = state.memberships
      .filter(m => m.userId === authState.currentUser!.id && m.status === 'active')
      .map(m => m.workspaceId);
    return state.workspaces.filter(w => userWsIds.includes(w.id));
  }, [authState.currentUser, state.memberships, state.workspaces]);

  const getWorkspaceMembers = useCallback((workspaceId: string) => {
    // For the current workspace, use the eagerly-loaded allMembers
    if (workspaceId === state.currentWorkspaceId) {
      return state.allMembers;
    }
    // Fallback: filter from memberships (no user profile data)
    return state.memberships
      .filter(m => m.workspaceId === workspaceId)
      .map(m => ({ ...m, user: undefined }));
  }, [state.allMembers, state.currentWorkspaceId, state.memberships]);

  const getMemberRole = useCallback((userId: string, workspaceId: string) => {
    return state.memberships.find(
      m => m.userId === userId && m.workspaceId === workspaceId && m.status === 'active'
    )?.role ?? null;
  }, [state.memberships]);

  const changeMemberRole = useCallback(async (userId: string, workspaceId: string, newRole: Role): Promise<boolean> => {
    if (!currentRole || !canManageRole(currentRole, newRole)) return false;
    const target = state.memberships.find(m => m.userId === userId && m.workspaceId === workspaceId);
    if (!target || !canManageRole(currentRole, target.role)) return false;

    const { error } = await membershipsRepo.setRole(userId, workspaceId, newRole);
    if (error) return false;

    if (authState.currentUser) {
      await refreshMemberships(authState.currentUser.id);
      await refreshAllMembers(workspaceId);
    }
    return true;
  }, [currentRole, state.memberships, authState.currentUser]);

  const removeMember = useCallback(async (userId: string, workspaceId: string): Promise<boolean> => {
    const target = state.memberships.find(m => m.userId === userId && m.workspaceId === workspaceId);
    if (!target || !currentRole || !canManageRole(currentRole, target.role)) return false;

    const { error } = await membershipsRepo.remove(userId, workspaceId);
    if (error) return false;

    if (authState.currentUser) {
      await refreshMemberships(authState.currentUser.id);
      await refreshAllMembers(workspaceId);
    }
    return true;
  }, [currentRole, state.memberships, authState.currentUser]);

  // ---------------------------------------------------------------------------
  // Invites
  // ---------------------------------------------------------------------------

  const inviteMember = useCallback(async (email: string, role: Role): Promise<Invite | null> => {
    if (!authState.currentUser || !can('member:invite')) return null;
    // owner role cannot be assigned via invite
    const inviteRole = role === 'owner' ? 'admin' : role as Exclude<Role, 'owner'>;
    const { data, error } = await invitesRepo.create({
      workspaceId: state.currentWorkspaceId,
      email,
      role: inviteRole,
      invitedBy: authState.currentUser.id,
    });
    if (error || !data) return null;
    await refreshInvites(state.currentWorkspaceId);
    return toInvite(data);
  }, [authState.currentUser, state.currentWorkspaceId, can]);

  const cancelInvite = useCallback(async (inviteId: string) => {
    await invitesRepo.revoke(inviteId);
    await refreshInvites(state.currentWorkspaceId);
  }, [state.currentWorkspaceId]);

  /**
   * acceptInvite — stubbed: new flow uses token-based AcceptInvitePage.
   */
  const acceptInvite = useCallback((_inviteId: string): boolean => {
    return false;
  }, []);

  const getWorkspaceInvites = useCallback((workspaceId: string) => {
    return state.invites.filter(i => i.workspaceId === workspaceId && i.status === 'pending');
  }, [state.invites]);

  const addMemberToWorkspace = useCallback(async (userId: string, workspaceId: string, role: Role) => {
    await membershipsRepo.insert({
      user_id: userId,
      workspace_id: workspaceId,
      role,
      invited_by: authState.currentUser?.id ?? null,
    });
    if (authState.currentUser) {
      await refreshMemberships(authState.currentUser.id);
      await refreshAllMembers(workspaceId);
    }
  }, [authState.currentUser]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
      addMemberToWorkspace,
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
