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

export interface AuthWorkspace {
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
