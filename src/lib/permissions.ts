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
    'workspace:create', 'workspace:invite',
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
