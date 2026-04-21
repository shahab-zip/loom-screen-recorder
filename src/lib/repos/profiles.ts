import { supabase } from '../supabase';

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  is_super_admin: boolean;
  created_at: string;
  last_login_at: string | null;
}

export const profilesRepo = {
  async getCurrent() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { data: null, error: new Error('not authenticated') };
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userRes.user.id)
      .single<ProfileRow>();
  },

  async update(id: string, patch: Partial<Pick<ProfileRow, 'name' | 'avatar'>>) {
    return supabase.from('profiles').update(patch).eq('id', id).select().single<ProfileRow>();
  },

  async listAll() {
    return supabase.from('profiles').select('*').order('created_at', { ascending: false });
  },
};
