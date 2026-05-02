import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoPermissions } from '../useVideoPermissions';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentRole: 'member' }),
}));

describe('useVideoPermissions', () => {
  it('member can delete/edit own', () => {
    const { result } = renderHook(() => useVideoPermissions({ ownerId: 'u1' }));
    expect(result.current.canDelete).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });
  it('member cannot delete/edit others', () => {
    const { result } = renderHook(() => useVideoPermissions({ ownerId: 'u2' }));
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});
