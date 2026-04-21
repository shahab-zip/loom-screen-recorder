import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitesRepo } from '../invites';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

describe('invitesRepo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an invite', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'i1' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    (supabase.from as any).mockReturnValue({ insert });
    await invitesRepo.create({ workspaceId: 'ws1', email: 'a@b.com', role: 'member', invitedBy: 'u1' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'ws1', email: 'a@b.com', role: 'member', invited_by: 'u1',
    }));
  });

  it('accepts an invite via rpc', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: [{ workspace_id: 'ws1', role: 'member' }], error: null });
    const res = await invitesRepo.accept('tok123');
    expect(supabase.rpc).toHaveBeenCalledWith('accept_invite', { _token: 'tok123' });
    expect(res.data?.workspace_id).toBe('ws1');
  });
});
