import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission } from '../usePermission';

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentRole: 'member' }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { isSuperAdmin: false } } }),
}));

describe('usePermission', () => {
  it('returns true for member:view (member role)', () => {
    const { result } = renderHook(() => usePermission('member:view'));
    expect(result.current).toBe(true);
  });
  it('returns false for workspace:delete (member role)', () => {
    const { result } = renderHook(() => usePermission('workspace:delete'));
    expect(result.current).toBe(false);
  });
});
