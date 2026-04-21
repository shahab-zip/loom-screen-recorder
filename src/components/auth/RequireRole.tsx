import type { ReactNode } from 'react';
import { useCurrentRole } from '../../hooks/useCurrentRole';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HIERARCHY, type Role } from '../../lib/auth-types';

export function RequireRole({
  minRole, children, fallback = null,
}: { minRole: Role; children: ReactNode; fallback?: ReactNode }) {
  const role = useCurrentRole();
  const { state } = useAuth();
  if (state.currentUser?.isSuperAdmin) return <>{children}</>;
  if (!role) return <>{fallback}</>;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole] ? <>{children}</> : <>{fallback}</>;
}
