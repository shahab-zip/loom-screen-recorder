import React from 'react';
import type { Permission } from '../../lib/auth-types';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ permission, requireAll = false, fallback = null, children }: RoleGuardProps) {
  const { can, currentRole } = useWorkspace();
  const { state: authState } = useAuth();
  const isSuperAdmin = authState.currentUser?.isSuperAdmin ?? false;

  // Super admins bypass role/permission checks entirely. Without this,
  // a super admin with no workspace membership would see nothing.
  if (isSuperAdmin) return <>{children}</>;

  if (!currentRole) return <>{fallback}</>;

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? permissions.every(p => can(p))
    : permissions.some(p => can(p));

  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
