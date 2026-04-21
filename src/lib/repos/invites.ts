import { supabase } from '../supabase';
import type { Role } from '../auth-types';

export interface InviteRow {
  id: string;
  email: string;
  workspace_id: string;
  role: Role;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  token: string;
}

export const invitesRepo = {
  async listByWorkspace(workspaceId: string) {
    return supabase
      .from('invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
  },

  async create(input: { workspaceId: string; email: string; role: Exclude<Role, 'owner'>; invitedBy: string }) {
    return supabase
      .from('invites')
      .insert({
        workspace_id: input.workspaceId,
        email: input.email.toLowerCase().trim(),
        role: input.role,
        invited_by: input.invitedBy,
      })
      .select()
      .single<InviteRow>();
  },

  async revoke(id: string) {
    return supabase.from('invites').update({ status: 'revoked' }).eq('id', id);
  },

  async accept(token: string) {
    const res = await supabase.rpc('accept_invite', { _token: token });
    if (res.error) return { data: null, error: res.error };
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: row as { workspace_id: string; role: Role } | null, error: null };
  },
};
