# Roles, Workspaces & Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete user authentication, role-based access control, and workspace management system with real permission enforcement across the entire app.

**Architecture:** A client-side auth system using localStorage (ready for backend swap) with a `UserContext` for auth state, a `PermissionsContext` for role-based access guards, and a `WorkspaceContext` for workspace CRUD + membership. Permission checks happen at the route level (guards), component level (conditional rendering), and action level (button disabling). The system layers on top of the existing `AppContext` without modifying its core reducer.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Radix UI (existing shadcn components), localStorage persistence, Context API

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/auth-types.ts` | User, Role, Permission, Membership type definitions |
| `src/lib/permissions.ts` | Permission matrix, role hierarchy, permission check helpers |
| `src/contexts/AuthContext.tsx` | Auth state (currentUser, login, logout, register, update profile) |
| `src/contexts/WorkspaceContext.tsx` | Workspace CRUD, membership, invites, role assignment |
| `src/components/auth/LoginPage.tsx` | Login form with email + password |
| `src/components/auth/RegisterPage.tsx` | Registration form |
| `src/components/auth/AuthGuard.tsx` | Route-level auth wrapper (redirects to login) |
| `src/components/auth/RoleGuard.tsx` | Component-level permission wrapper |
| `src/components/auth/InviteModal.tsx` | Email invite with role selector |
| `src/components/auth/UserMenu.tsx` | Avatar dropdown with profile, switch account, logout |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with AuthGuard, add login/register routes, permission checks on views |
| `src/components/Sidebar.tsx` | Show/hide admin sections by role, user menu integration |
| `src/components/ManagePage.tsx` | Replace mock data with real membership, enforce role-based actions |
| `src/components/WorkspaceSettingsPage.tsx` | Gate settings tabs by admin role, save to workspace context |
| `src/components/SpacesPage.tsx` | Permission-gated create/edit/delete |
| `src/components/Settings.tsx` | Pull profile from AuthContext, save profile changes |
| `src/components/VideoLibrary.tsx` | Filter by workspace membership, hide delete for viewers |
| `src/components/Workspaces.tsx` | Permission-gated workspace creation, role display |
| `src/contexts/AppContext.tsx` | Import currentUser for video ownership |
| `src/lib/storage.ts` | Add user-scoped storage helpers |

---

## Task 1: Define Auth & Permission Types

**Files:**
- Create: `src/lib/auth-types.ts`

- [ ] **Step 1: Create the type definitions file**

```typescript
// src/lib/auth-types.ts

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'workspace:create'
  | 'workspace:edit'
  | 'workspace:delete'
  | 'workspace:invite'
  | 'workspace:manage-members'
  | 'workspace:manage-roles'
  | 'workspace:view-settings'
  | 'workspace:edit-settings'
  | 'workspace:view-billing'
  | 'space:create'
  | 'space:edit'
  | 'space:delete'
  | 'space:invite'
  | 'video:create'
  | 'video:edit-own'
  | 'video:edit-any'
  | 'video:delete-own'
  | 'video:delete-any'
  | 'video:view'
  | 'video:download'
  | 'member:view'
  | 'member:invite'
  | 'member:remove'
  | 'member:change-role';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface WorkspaceMembership {
  userId: string;
  workspaceId: string;
  role: Role;
  joinedAt: string;
  invitedBy: string | null;
  status: 'active' | 'pending' | 'deactivated';
}

export interface Invite {
  id: string;
  email: string;
  workspaceId: string;
  role: Role;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  createdBy: string;
  createdAt: string;
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  defaultVideoPrivacy: 'public' | 'workspace' | 'private';
  allowGuestViewing: boolean;
  requireApproval: boolean;
  allowDownloads: boolean;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultVideoPrivacy: 'workspace',
  allowGuestViewing: false,
  requireApproval: false,
  allowDownloads: true,
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<Role, string> = {
  owner: 'text-amber-600 bg-amber-50 border-amber-200',
  admin: 'text-purple-600 bg-purple-50 border-purple-200',
  member: 'text-blue-600 bg-blue-50 border-blue-200',
  viewer: 'text-gray-600 bg-gray-50 border-gray-200',
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npx tsc --noEmit src/lib/auth-types.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-types.ts
git commit -m "feat: add auth and permission type definitions"
```

---

## Task 2: Build Permission Matrix & Helpers

**Files:**
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Create the permissions module**

```typescript
// src/lib/permissions.ts

import type { Role, Permission } from './auth-types';
import { ROLE_HIERARCHY } from './auth-types';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'workspace:create', 'workspace:edit', 'workspace:delete',
    'workspace:invite', 'workspace:manage-members', 'workspace:manage-roles',
    'workspace:view-settings', 'workspace:edit-settings', 'workspace:view-billing',
    'space:create', 'space:edit', 'space:delete', 'space:invite',
    'video:create', 'video:edit-own', 'video:edit-any',
    'video:delete-own', 'video:delete-any', 'video:view', 'video:download',
    'member:view', 'member:invite', 'member:remove', 'member:change-role',
  ],
  admin: [
    'workspace:edit', 'workspace:invite', 'workspace:manage-members',
    'workspace:view-settings', 'workspace:edit-settings', 'workspace:view-billing',
    'space:create', 'space:edit', 'space:delete', 'space:invite',
    'video:create', 'video:edit-own', 'video:edit-any',
    'video:delete-own', 'video:delete-any', 'video:view', 'video:download',
    'member:view', 'member:invite', 'member:remove', 'member:change-role',
  ],
  member: [
    'workspace:invite',
    'space:create', 'space:edit', 'space:invite',
    'video:create', 'video:edit-own', 'video:delete-own',
    'video:view', 'video:download',
    'member:view', 'member:invite',
  ],
  viewer: [
    'video:view',
    'member:view',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export function getAssignableRoles(actorRole: Role): Role[] {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  return (Object.entries(ROLE_HIERARCHY) as [Role, number][])
    .filter(([, level]) => level < actorLevel)
    .map(([role]) => role);
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npx tsc --noEmit src/lib/permissions.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat: add permission matrix and role hierarchy helpers"
```

---

## Task 3: Build AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Create the AuthContext**

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { User } from '../lib/auth-types';
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_PROFILE'; payload: Partial<User> };

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, currentUser: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_PROFILE':
      if (!state.currentUser) return state;
      const updated = { ...state.currentUser, ...action.payload };
      return { ...state, currentUser: updated };
    default:
      return state;
  }
}

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredCredential {
  userId: string;
  email: string;
  passwordHash: string;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const sessionUserId = getStorageItem<string | null>('auth-session', null);
    if (sessionUserId) {
      const users = getStorageItem<User[]>('auth-users', []);
      const user = users.find(u => u.id === sessionUserId);
      if (user) {
        const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
        dispatch({ type: 'SET_USER', payload: updatedUser });
        const updatedUsers = users.map(u => u.id === sessionUserId ? updatedUser : u);
        setStorageItem('auth-users', updatedUsers);
        return;
      }
    }
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const login = useCallback((email: string, password: string) => {
    const creds = getStorageItem<StoredCredential[]>('auth-credentials', []);
    const cred = creds.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!cred) return { success: false, error: 'No account found with this email' };
    if (cred.passwordHash !== simpleHash(password)) return { success: false, error: 'Incorrect password' };

    const users = getStorageItem<User[]>('auth-users', []);
    const user = users.find(u => u.id === cred.userId);
    if (!user) return { success: false, error: 'User data corrupted' };

    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    dispatch({ type: 'SET_USER', payload: updatedUser });
    setStorageItem('auth-session', user.id);
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    setStorageItem('auth-users', updatedUsers);
    return { success: true };
  }, []);

  const register = useCallback((name: string, email: string, password: string) => {
    const creds = getStorageItem<StoredCredential[]>('auth-credentials', []);
    if (creds.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const userId = `user_${Date.now()}`;
    const now = new Date().toISOString();
    const newUser: User = {
      id: userId,
      name,
      email,
      avatar: '',
      createdAt: now,
      lastLoginAt: now,
    };

    const newCred: StoredCredential = {
      userId,
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
    };

    const users = getStorageItem<User[]>('auth-users', []);
    setStorageItem('auth-users', [...users, newUser]);
    setStorageItem('auth-credentials', [...creds, newCred]);
    setStorageItem('auth-session', userId);

    dispatch({ type: 'SET_USER', payload: newUser });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    removeStorageItem('auth-session');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: data });
    const users = getStorageItem<User[]>('auth-users', []);
    if (state.currentUser) {
      const updated = users.map(u =>
        u.id === state.currentUser!.id ? { ...u, ...data } : u
      );
      setStorageItem('auth-users', updated);
    }
  }, [state.currentUser]);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npx tsc --noEmit src/contexts/AuthContext.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add AuthContext with login, register, logout, profile update"
```

---

## Task 4: Build WorkspaceContext

**Files:**
- Create: `src/contexts/WorkspaceContext.tsx`

- [ ] **Step 1: Create the WorkspaceContext**

```typescript
// src/contexts/WorkspaceContext.tsx

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Workspace, WorkspaceMembership, Invite, Role, WorkspaceSettings } from '../lib/auth-types';
import { DEFAULT_WORKSPACE_SETTINGS } from '../lib/auth-types';
import { hasPermission, canManageRole } from '../lib/permissions';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAuth } from './AuthContext';

interface WorkspaceState {
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
  invites: Invite[];
  currentWorkspaceId: string;
}

type WorkspaceAction =
  | { type: 'SET_WORKSPACES'; payload: Workspace[] }
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
  currentWorkspace: Workspace | null;
  currentRole: Role | null;

  // Workspace CRUD
  createWorkspace: (name: string, description: string, color: string) => Workspace;
  updateWorkspace: (id: string, data: Partial<Pick<Workspace, 'name' | 'description' | 'color'>>) => void;
  updateWorkspaceSettings: (id: string, settings: Partial<WorkspaceSettings>) => void;
  deleteWorkspace: (id: string) => boolean;
  switchWorkspace: (id: string) => void;

  // Membership
  getUserWorkspaces: () => Workspace[];
  getWorkspaceMembers: (workspaceId: string) => (WorkspaceMembership & { user?: import('../lib/auth-types').User })[];
  getMemberRole: (userId: string, workspaceId: string) => Role | null;
  changeMemberRole: (userId: string, workspaceId: string, newRole: Role) => boolean;
  removeMember: (userId: string, workspaceId: string) => boolean;

  // Invites
  inviteMember: (email: string, role: Role) => Invite | null;
  cancelInvite: (inviteId: string) => void;
  acceptInvite: (inviteId: string) => boolean;
  getWorkspaceInvites: (workspaceId: string) => Invite[];

  // Permission check shortcut
  can: (permission: import('../lib/auth-types').Permission) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Persist on change
  useEffect(() => {
    setStorageItem('ws-workspaces', state.workspaces);
    setStorageItem('ws-memberships', state.memberships);
    setStorageItem('ws-invites', state.invites);
    setStorageItem('ws-current', state.currentWorkspaceId);
  }, [state]);

  // Hydrate on mount or user change
  useEffect(() => {
    if (!authState.currentUser) return;

    const workspaces = getStorageItem<Workspace[]>('ws-workspaces', []);
    const memberships = getStorageItem<WorkspaceMembership[]>('ws-memberships', []);
    const invites = getStorageItem<Invite[]>('ws-invites', []);
    const currentId = getStorageItem<string>('ws-current', 'default');

    // Ensure default workspace exists with this user as owner
    if (!workspaces.some(w => w.id === 'default')) {
      const defaultWs: Workspace = {
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

  const can = useCallback((permission: import('../lib/auth-types').Permission) => {
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  }, [currentRole]);

  const createWorkspace = useCallback((name: string, description: string, color: string) => {
    const userId = authState.currentUser!.id;
    const ws: Workspace = {
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

  const updateWorkspace = useCallback((id: string, data: Partial<Pick<Workspace, 'name' | 'description' | 'color'>>) => {
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
    const users = getStorageItem<import('../lib/auth-types').User[]>('auth-users', []);
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npx tsc --noEmit src/contexts/WorkspaceContext.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/contexts/WorkspaceContext.tsx
git commit -m "feat: add WorkspaceContext with CRUD, membership, invites, permissions"
```

---

## Task 5: Build Login & Register Pages

**Files:**
- Create: `src/components/auth/LoginPage.tsx`
- Create: `src/components/auth/RegisterPage.tsx`

- [ ] **Step 1: Create LoginPage**

```typescript
// src/components/auth/LoginPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            Now in Beta
          </div>
          <h1 className="text-3xl font-bold text-[#030213] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[#717182] text-sm mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-[#717182] mt-6">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create RegisterPage**

```typescript
// src/components/auth/RegisterPage.tsx

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = register(name.trim(), email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#030213] tracking-tight">
            Create your account
          </h1>
          <p className="text-[#717182] text-sm mt-2">
            Start recording and sharing in seconds
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#717182] mt-6">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/LoginPage.tsx src/components/auth/RegisterPage.tsx
git commit -m "feat: add LoginPage and RegisterPage with design system styling"
```

---

## Task 6: Build AuthGuard, RoleGuard, InviteModal

**Files:**
- Create: `src/components/auth/AuthGuard.tsx`
- Create: `src/components/auth/RoleGuard.tsx`
- Create: `src/components/auth/InviteModal.tsx`

- [ ] **Step 1: Create AuthGuard**

```typescript
// src/components/auth/AuthGuard.tsx

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return authView === 'login'
      ? <LoginPage onSwitchToRegister={() => setAuthView('register')} />
      : <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create RoleGuard**

```typescript
// src/components/auth/RoleGuard.tsx

import React from 'react';
import type { Permission } from '../../lib/auth-types';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface RoleGuardProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ permission, requireAll = false, fallback = null, children }: RoleGuardProps) {
  const { can, currentRole } = useWorkspace();

  if (!currentRole) return <>{fallback}</>;

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? permissions.every(p => can(p))
    : permissions.some(p => can(p));

  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
```

- [ ] **Step 3: Create InviteModal**

```typescript
// src/components/auth/InviteModal.tsx

import React, { useState } from 'react';
import type { Role } from '../../lib/auth-types';
import { ROLE_LABELS } from '../../lib/auth-types';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getAssignableRoles } from '../../lib/permissions';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { inviteMember, currentRole, currentWorkspace } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !currentRole) return null;

  const assignableRoles = getAssignableRoles(currentRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const invite = inviteMember(email.trim(), role);
    if (invite) {
      setSuccess(true);
      setEmail('');
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } else {
      setError('Failed to send invite');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-[rgba(0,0,0,0.1)] shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-bold text-[#030213] mb-1">
          Invite to {currentWorkspace?.name || 'workspace'}
        </h2>
        <p className="text-sm text-[#717182] mb-5">
          Send an invite link via email
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              Invite sent successfully!
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)] placeholder:text-[#717182]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#030213] mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full h-10 px-3 rounded-lg bg-[#f3f3f5] border border-[rgba(0,0,0,0.1)] text-[#030213] text-sm outline-none transition-all focus:border-[rgba(0,0,0,0.2)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.06)]"
            >
              {assignableRoles.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-[#030213] text-sm font-semibold hover:bg-[#e9ebef] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-all shadow-md shadow-red-600/20"
            >
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthGuard.tsx src/components/auth/RoleGuard.tsx src/components/auth/InviteModal.tsx
git commit -m "feat: add AuthGuard, RoleGuard, and InviteModal components"
```

---

## Task 7: Integrate Auth into App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Wrap the app in providers (main.tsx)**

Open `src/main.tsx` and wrap the `<App />` component:

```typescript
// At the top, add:
import { AuthProvider } from './contexts/AuthContext';

// In the render, wrap App:
// Before:
//   <App />
// After:
//   <AuthProvider>
//     <App />
//   </AuthProvider>
```

- [ ] **Step 2: Add AuthGuard and WorkspaceProvider to App.tsx**

Open `src/App.tsx` and add the wrapping layers:

```typescript
// At the top, add these imports:
import { AuthGuard } from './components/auth/AuthGuard';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

// Wrap the existing return JSX:
// The outermost returned JSX should become:
//   <AuthGuard>
//     <WorkspaceProvider>
//       {/* existing AppProvider + layout JSX */}
//     </WorkspaceProvider>
//   </AuthGuard>
```

- [ ] **Step 3: Verify the app boots**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npm run dev`
Expected: App shows Login page (no session exists). Register a new account, confirm you reach the main app.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: integrate AuthGuard and WorkspaceProvider into app root"
```

---

## Task 8: Wire Sidebar with Roles

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add auth/workspace imports and permission checks**

At the top of `Sidebar.tsx`, add:

```typescript
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
import { InviteModal } from './auth/InviteModal';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/auth-types';
```

- [ ] **Step 2: Use auth state for user display**

Inside the Sidebar component, replace hardcoded user data:

```typescript
const { state: authState, logout } = useAuth();
const { currentWorkspace, currentRole, getUserWorkspaces, switchWorkspace, can } = useWorkspace();
const [showInviteModal, setShowInviteModal] = useState(false);

const userName = authState.currentUser?.name || 'User';
const userEmail = authState.currentUser?.email || '';
const userWorkspaces = getUserWorkspaces();
```

- [ ] **Step 3: Gate admin sidebar items by role**

Wrap the admin section (Manage, Workspace Settings, Billing) with RoleGuard:

```tsx
{/* Admin Tools - only for admin+ */}
<RoleGuard permission="workspace:view-settings">
  <div className="...admin tools section...">
    {/* Manage (Users) */}
    <RoleGuard permission="workspace:manage-members">
      <button onClick={() => onViewChange('manage')}>Manage</button>
    </RoleGuard>
    
    {/* Workspace Settings */}
    <button onClick={() => onViewChange('workspace-settings')}>Workspace</button>
    
    {/* Billing */}
    <RoleGuard permission="workspace:view-billing">
      <button onClick={() => onViewChange('billing')}>Billing</button>
    </RoleGuard>
  </div>
</RoleGuard>
```

- [ ] **Step 4: Wire invite button**

Replace the existing "Invite teammates" button handler:

```tsx
<RoleGuard permission="member:invite">
  <button onClick={() => setShowInviteModal(true)}>
    Invite teammates
  </button>
</RoleGuard>

{/* At the end of the component return */}
<InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
```

- [ ] **Step 5: Add role badge next to user name**

In the user avatar/dropdown area, show the current role:

```tsx
{currentRole && (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[currentRole]}`}>
    {ROLE_LABELS[currentRole]}
  </span>
)}
```

- [ ] **Step 6: Wire workspace switcher to WorkspaceContext**

Replace the existing workspace switching logic to use `switchWorkspace()` from context, and populate the dropdown from `getUserWorkspaces()`.

- [ ] **Step 7: Add logout to user menu**

Add a logout button at the bottom of the user dropdown/menu that calls `logout()`.

- [ ] **Step 8: Verify sidebar renders correctly for different roles**

Run the dev server, register, and confirm:
- Owner sees all admin tools
- Sidebar shows role badge
- Workspace switcher works
- Invite modal opens

- [ ] **Step 9: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: wire Sidebar with role-based nav, workspace switcher, invite modal"
```

---

## Task 9: Update ManagePage with Real Membership Data

**Files:**
- Modify: `src/components/ManagePage.tsx`

- [ ] **Step 1: Replace mock data with context data**

Remove the `MOCK_MEMBERS` constant and replace with WorkspaceContext data:

```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { RoleGuard } from './auth/RoleGuard';
import { InviteModal } from './auth/InviteModal';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/auth-types';
import { getAssignableRoles } from '../lib/permissions';
import type { Role } from '../lib/auth-types';

// Inside component:
const { getWorkspaceMembers, getWorkspaceInvites, changeMemberRole, removeMember, currentRole, state: wsState } = useWorkspace();
const { state: authState } = useAuth();

const members = getWorkspaceMembers(wsState.currentWorkspaceId);
const pendingInvites = getWorkspaceInvites(wsState.currentWorkspaceId);
```

- [ ] **Step 2: Gate actions by permission**

```tsx
{/* Change role dropdown - only visible if actor can manage this member's role */}
{can('member:change-role') && canManageRole(currentRole!, member.role) && (
  <select
    value={member.role}
    onChange={e => changeMemberRole(member.userId, wsState.currentWorkspaceId, e.target.value as Role)}
    className="..."
  >
    {getAssignableRoles(currentRole!).map(r => (
      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
    ))}
  </select>
)}

{/* Remove button */}
{can('member:remove') && canManageRole(currentRole!, member.role) && member.userId !== authState.currentUser?.id && (
  <button onClick={() => removeMember(member.userId, wsState.currentWorkspaceId)}>
    Remove
  </button>
)}
```

- [ ] **Step 3: Add pending invites section**

```tsx
{pendingInvites.length > 0 && (
  <div className="mt-6">
    <h3 className="text-sm font-semibold text-[#030213] mb-3">
      Pending Invites ({pendingInvites.length})
    </h3>
    {pendingInvites.map(invite => (
      <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl border border-[rgba(0,0,0,0.1)] mb-2">
        <div>
          <p className="text-sm font-medium text-[#030213]">{invite.email}</p>
          <p className="text-xs text-[#717182]">
            Invited as {ROLE_LABELS[invite.role]} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => cancelInvite(invite.id)}
          className="text-xs text-[#717182] hover:text-red-600 font-medium"
        >
          Cancel
        </button>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Verify the manage page works**

Run dev server, create a workspace, and verify:
- Members list shows current user as Owner
- Role dropdown works
- Pending invites section appears after inviting

- [ ] **Step 5: Commit**

```bash
git add src/components/ManagePage.tsx
git commit -m "feat: replace mock members with real WorkspaceContext data, add role-gated actions"
```

---

## Task 10: Update WorkspaceSettingsPage with Permission Gates

**Files:**
- Modify: `src/components/WorkspaceSettingsPage.tsx`

- [ ] **Step 1: Import and use workspace context**

```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
```

Inside the component:

```typescript
const { currentWorkspace, updateWorkspace, updateWorkspaceSettings, deleteWorkspace, can } = useWorkspace();
```

- [ ] **Step 2: Wire form fields to workspace context**

Replace hardcoded workspace data with `currentWorkspace` values. Wire onChange handlers to call `updateWorkspace()` and `updateWorkspaceSettings()`.

- [ ] **Step 3: Gate the Danger Zone by owner role**

```tsx
<RoleGuard permission="workspace:delete">
  <div className="border border-red-200 rounded-xl p-6 bg-red-50/50">
    <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
    {/* Delete workspace button */}
  </div>
</RoleGuard>
```

- [ ] **Step 4: Disable edit fields for viewers**

```tsx
const canEdit = can('workspace:edit-settings');

<input
  disabled={!canEdit}
  className={`... ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
  // ...
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkspaceSettingsPage.tsx
git commit -m "feat: wire workspace settings to context, gate by permissions"
```

---

## Task 11: Update Workspaces.tsx with Real CRUD

**Files:**
- Modify: `src/components/Workspaces.tsx`

- [ ] **Step 1: Import and use contexts**

```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
```

- [ ] **Step 2: Replace mock workspace data with context**

```typescript
const { getUserWorkspaces, createWorkspace, deleteWorkspace, switchWorkspace, can, getMemberRole } = useWorkspace();
const { state: authState } = useAuth();
const workspaces = getUserWorkspaces();
```

- [ ] **Step 3: Gate create workspace button**

```tsx
<RoleGuard permission="workspace:create">
  <button onClick={() => setShowCreateModal(true)}>
    Create Workspace
  </button>
</RoleGuard>
```

- [ ] **Step 4: Show role badge per workspace**

In each workspace card, show the user's role in that workspace:

```tsx
const role = getMemberRole(authState.currentUser!.id, workspace.id);
{role && (
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
    {ROLE_LABELS[role]}
  </span>
)}
```

- [ ] **Step 5: Wire create workspace form to context**

```typescript
const handleCreate = () => {
  if (!newName.trim()) return;
  createWorkspace(newName.trim(), newDescription, selectedColor);
  setShowCreateModal(false);
  setNewName('');
  setNewDescription('');
};
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Workspaces.tsx
git commit -m "feat: wire Workspaces page to context CRUD, add role badges"
```

---

## Task 12: Update Settings.tsx with Auth Profile

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Import auth context**

```typescript
import { useAuth } from '../contexts/AuthContext';
```

- [ ] **Step 2: Pull profile from auth state**

```typescript
const { state: authState, updateProfile, logout } = useAuth();
const userName = authState.currentUser?.name || '';
const userEmail = authState.currentUser?.email || '';
```

- [ ] **Step 3: Wire profile save to updateProfile**

In the Profile tab, replace hardcoded values with auth state, and wire the save handler:

```typescript
const handleSaveProfile = () => {
  updateProfile({ name: editedName });
  // show success toast
};
```

- [ ] **Step 4: Wire sign out button to logout**

```tsx
<button onClick={logout} className="...">
  Sign out
</button>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: wire Settings profile tab to AuthContext"
```

---

## Task 13: Permission-Gate Video Actions

**Files:**
- Modify: `src/components/VideoLibrary.tsx`

- [ ] **Step 1: Import workspace context**

```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
```

- [ ] **Step 2: Gate delete/rename by ownership**

```typescript
const { can } = useWorkspace();
const { state: authState } = useAuth();

// For each video action:
const canDelete = (video: Video) =>
  can('video:delete-any') || (can('video:delete-own') && video.createdBy === authState.currentUser?.id);

const canEdit = (video: Video) =>
  can('video:edit-any') || (can('video:edit-own') && video.createdBy === authState.currentUser?.id);
```

- [ ] **Step 3: Hide actions for viewers**

```tsx
{canDelete(video) && (
  <button onClick={() => handleDeleteVideo(video.id)}>Delete</button>
)}
{canEdit(video) && (
  <button onClick={() => handleRenameVideo(video.id, newTitle)}>Rename</button>
)}
```

- [ ] **Step 4: Gate "New Recording" button**

```tsx
{can('video:create') ? (
  <button onClick={openRecordingModal}>New Recording</button>
) : (
  <button disabled className="opacity-50 cursor-not-allowed">
    New Recording
  </button>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoLibrary.tsx
git commit -m "feat: permission-gate video delete/edit/create actions"
```

---

## Task 14: Update SpacesPage with Permission Gates

**Files:**
- Modify: `src/components/SpacesPage.tsx`

- [ ] **Step 1: Import and use workspace context**

```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
```

- [ ] **Step 2: Gate create/edit/delete space actions**

```tsx
<RoleGuard permission="space:create">
  <button onClick={() => setShowCreateModal(true)}>Create Space</button>
</RoleGuard>

{/* Per space card */}
<RoleGuard permission="space:edit">
  <button>Edit</button>
</RoleGuard>
<RoleGuard permission="space:delete">
  <button>Delete</button>
</RoleGuard>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SpacesPage.tsx
git commit -m "feat: permission-gate Spaces create/edit/delete"
```

---

## Task 15: Add Video createdBy Field

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/contexts/AppContext.tsx`

- [ ] **Step 1: Add createdBy to Video type**

In `src/lib/types.ts`, add `createdBy` to both `Video` and `VideoRaw`:

```typescript
// Add to Video interface:
createdBy?: string;

// Add to VideoRaw interface:
createdBy?: string;
```

- [ ] **Step 2: Set createdBy when creating new videos**

In `AppContext.tsx`, in the `handleNewVideo` function, add the current user's ID:

```typescript
// Import useAuth at the top (or pass userId as parameter)
// In handleNewVideo:
const newVideo: Video = {
  // ... existing fields ...
  createdBy: data.createdBy || 'unknown',
};
```

Note: The `handleNewVideo` callback needs to receive `createdBy` from the caller, which will be the AuthContext's `currentUser.id`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/contexts/AppContext.tsx
git commit -m "feat: add createdBy field to Video type for ownership tracking"
```

---

## Task 16: Final Integration Verification

- [ ] **Step 1: Full smoke test**

Run: `cd /Users/shifu/Documents/Claude/Loom-like\ Tool\ Design && npm run dev`

Test flow:
1. Open app — see Login page
2. Click "Create one" — see Register page
3. Register with name/email/password — redirected to main app
4. Sidebar shows role badge "Owner" next to name
5. Navigate to Manage — see yourself as Owner
6. Navigate to Workspace Settings — all settings editable
7. Click "Invite teammates" — modal opens with role selector
8. Create a new workspace — appears in workspace switcher
9. Switch workspace — sidebar updates, videos filter
10. Settings > Profile shows your registered name/email
11. Sign out — returns to Login page
12. Sign back in — session restored

- [ ] **Step 2: Verify permission enforcement**

To test viewer restrictions, temporarily change your role in localStorage:
1. Open DevTools > Application > Local Storage
2. In `ws-memberships`, change your role from `"owner"` to `"viewer"`
3. Refresh — confirm:
   - Admin tools hidden in sidebar
   - Manage page not accessible
   - Delete/rename buttons hidden on videos
   - "New Recording" button disabled
   - Workspace settings read-only

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "feat: complete roles, workspaces, and access control system"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Type definitions for User, Role, Permission, Workspace, Membership, Invite |
| 2 | Permission matrix mapping roles → permissions, hierarchy helpers |
| 3 | AuthContext — login, register, logout, profile update, session persistence |
| 4 | WorkspaceContext — CRUD, membership, invites, role changes, `can()` helper |
| 5 | Login & Register pages matching the design system |
| 6 | AuthGuard (route protection), RoleGuard (component permission gate), InviteModal |
| 7 | App.tsx/main.tsx integration with provider wrappers |
| 8 | Sidebar — role badge, gated admin nav, workspace switcher, invite button, logout |
| 9 | ManagePage — real membership data, role changes, invite management |
| 10 | WorkspaceSettingsPage — context-wired settings, danger zone gating |
| 11 | Workspaces page — real CRUD, role badges per workspace |
| 12 | Settings — auth profile integration |
| 13 | VideoLibrary — permission-gated delete/edit/create |
| 14 | SpacesPage — permission-gated CRUD |
| 15 | Video.createdBy for ownership tracking |
| 16 | Full integration smoke test |
