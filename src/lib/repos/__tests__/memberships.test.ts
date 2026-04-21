import { describe, it, expect, vi, beforeEach } from 'vitest';
import { membershipsRepo } from '../memberships';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({ supabase: { from: vi.fn() } }));

describe('membershipsRepo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists memberships for a workspace', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any).mockReturnValue({ select });
    await membershipsRepo.listByWorkspace('ws1');
    expect(supabase.from).toHaveBeenCalledWith('memberships');
    expect(eq).toHaveBeenCalledWith('workspace_id', 'ws1');
  });

  it('changes role', async () => {
    const eq2 = vi.fn().mockResolvedValue({ data: {}, error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    (supabase.from as any).mockReturnValue({ update });
    await membershipsRepo.setRole('u1', 'ws1', 'admin');
    expect(update).toHaveBeenCalledWith({ role: 'admin' });
  });
});
