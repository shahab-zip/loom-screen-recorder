import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/auth-types';

export function RequirePermission({
  permission, children, fallback = null,
}: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return usePermission(permission) ? <>{children}</> : <>{fallback}</>;
}
