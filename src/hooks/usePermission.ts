import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../lib/permissions';
import type { Permission } from '../lib/auth-types';

export function usePermission(permission: Permission): boolean {
  const { currentRole } = useWorkspace();
  const { state } = useAuth();
  if (state.currentUser?.isSuperAdmin) return true;
  if (!currentRole) return false;
  return hasPermission(currentRole, permission);
}
