import { useWorkspace } from '../contexts/WorkspaceContext';
import type { Role } from '../lib/auth-types';

export function useCurrentRole(): Role | null {
  return useWorkspace().currentRole;
}
