import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { WorkspaceProvider, useWorkspace } from '../WorkspaceContext';

const createMock = vi.fn();
vi.mock('../../lib/repos/workspaces', () => ({
  workspacesRepo: {
    create: (...args: unknown[]) => createMock(...args),
    listMine: async () => ({ data: [], error: null }),
    update: async () => ({ data: null, error: null }),
    remove: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../../lib/repos/memberships', () => ({
  membershipsRepo: {
    listForUser: async () => ({ data: [{ user_id: 'u1', workspace_id: 'w1', role: 'viewer', joined_at: '', invited_by: null, status: 'active' }], error: null }),
    listByWorkspace: async () => ({ data: [], error: null }),
    setRole: async () => ({ data: null, error: null }),
    remove: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: {
    listByWorkspace: async () => ({ data: [], error: null }),
    create: async () => ({ data: null, error: null }),
    revoke: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));

let api: ReturnType<typeof useWorkspace>;
function Probe() {
  api = useWorkspace();
  return null;
}

describe('createWorkspace permission guard', () => {
  it('returns null and does not call repo when role is viewer', async () => {
    createMock.mockResolvedValue({ data: null, error: null });
    await act(async () => {
      render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    });
    let result: unknown;
    await act(async () => {
      result = await api.createWorkspace('Test', '', '#000');
    });
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });
});
