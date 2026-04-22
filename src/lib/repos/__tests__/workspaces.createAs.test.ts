// src/lib/repos/__tests__/workspaces.createAs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: { rpc: (fn: string, args: unknown) => rpcMock(fn, args) },
}));

import { workspacesRepo } from '../workspaces';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('workspacesRepo.createAs', () => {
  it('calls create_workspace_as RPC with correct args', async () => {
    rpcMock.mockResolvedValue({ data: { id: 'ws1', name: 'Marketing', created_by: 'user1' }, error: null });

    await workspacesRepo.createAs('user1', { name: 'Marketing', description: 'Team', color: '#ff0000' });

    expect(rpcMock).toHaveBeenCalledWith('create_workspace_as', {
      _owner_id: 'user1',
      _name: 'Marketing',
      _description: 'Team',
      _color: '#ff0000',
    });
  });

  it('returns RPC data on success', async () => {
    rpcMock.mockResolvedValue({ data: { id: 'ws1', name: 'Marketing', created_by: 'user1' }, error: null });
    const res = await workspacesRepo.createAs('user1', { name: 'Marketing' });
    expect(res.data?.id).toBe('ws1');
    expect(res.error).toBeNull();
  });

  it('returns RPC error on failure', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'super admin only' } });
    const res = await workspacesRepo.createAs('user1', { name: 'X' });
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: 'super admin only' });
  });
});
