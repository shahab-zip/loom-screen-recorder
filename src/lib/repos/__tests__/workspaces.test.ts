import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspacesRepo } from '../workspaces';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({ supabase: { from: vi.fn(), auth: { getUser: vi.fn() } } }));

describe('workspacesRepo.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a workspace then inserts owner membership', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const single = vi.fn().mockResolvedValue({ data: { id: 'ws1', name: 'A', description: '', color: '#625DF5', created_by: 'u1', settings: {}, created_at: '' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insertWs = vi.fn().mockReturnValue({ select });
    const insertMem = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any)
      .mockReturnValueOnce({ insert: insertWs })
      .mockReturnValueOnce({ insert: insertMem });

    const result = await workspacesRepo.create({ name: 'A' });
    expect(result.data?.id).toBe('ws1');
    expect(insertMem).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1', workspace_id: 'ws1', role: 'owner', status: 'active',
    }));
  });
});
