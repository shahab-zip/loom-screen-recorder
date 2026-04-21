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
