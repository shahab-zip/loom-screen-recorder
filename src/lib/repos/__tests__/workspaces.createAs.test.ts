// src/lib/repos/__tests__/workspaces.createAs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertWs = vi.fn();
const insertMem = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === 'workspaces') {
    return { insert: (row: any) => ({ select: () => ({ single: async () => insertWs(row) }) }) };
  }
  if (table === 'memberships') {
    return { insert: async (row: any) => insertMem(row) };
  }
  throw new Error('unexpected table ' + table);
});

vi.mock('../../supabase', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { workspacesRepo } from '../workspaces';

beforeEach(() => {
  insertWs.mockReset();
  insertMem.mockReset();
});

describe('workspacesRepo.createAs', () => {
  it('inserts workspace attributed to ownerId and creates owner membership', async () => {
    insertWs.mockResolvedValue({ data: { id: 'ws1', name: 'Marketing', created_by: 'user1' }, error: null });
    insertMem.mockResolvedValue({ error: null });

    const res = await workspacesRepo.createAs('user1', { name: 'Marketing', description: 'Team', color: '#ff0000' });

    expect(insertWs).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Marketing',
      description: 'Team',
      color: '#ff0000',
      created_by: 'user1',
      settings: {},
    }));
    expect(insertMem).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user1',
      workspace_id: 'ws1',
      role: 'owner',
      status: 'active',
    }));
    expect(res.data?.id).toBe('ws1');
    expect(res.error).toBeNull();
  });

  it('returns workspace insert error without calling membership insert', async () => {
    insertWs.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const res = await workspacesRepo.createAs('user1', { name: 'X' });
    expect(insertMem).not.toHaveBeenCalled();
    expect(res.error).toEqual({ message: 'denied' });
  });

  it('returns membership error if membership insert fails', async () => {
    insertWs.mockResolvedValue({ data: { id: 'ws2', name: 'X', created_by: 'user2' }, error: null });
    insertMem.mockResolvedValue({ error: { message: 'mem failed' } });
    const res = await workspacesRepo.createAs('user2', { name: 'X' });
    expect(res.error).toEqual({ message: 'mem failed' });
    expect(res.data).toBeNull();
  });
});
