import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profilesRepo } from '../profiles';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

describe('profilesRepo.getCurrent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the profile row for the logged-in user', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', name: 'X', email: 'x@y.com', is_super_admin: false }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any).mockReturnValue({ select });

    const result = await profilesRepo.getCurrent();
    expect(result.data?.id).toBe('u1');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});
