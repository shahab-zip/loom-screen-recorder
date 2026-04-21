import { supabase } from '../supabase';
import type { Role } from '../auth-types';

export interface MembershipRow {
  user_id: string;
  workspace_id: string;
  role: Role;
  status: 'active' | 'pending' | 'deactivated';
  invited_by: string | null;
  joined_at: string;
}

export const membershipsRepo = {
  async listByWorkspace(workspaceId: string) {
    return supabase
      .from('memberships')
      .select('*, profiles:user_id(id,name,email,avatar)')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });
  },

  async listForUser(userId: string) {
    return supabase
      .from('memberships')
      .select('*, workspaces:workspace_id(*)')
      .eq('user_id', userId)
      .eq('status', 'active');
  },

  async setRole(userId: string, workspaceId: string, role: Role) {
    return supabase
      .from('memberships')
      .update({ role })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
  },

  async remove(userId: string, workspaceId: string) {
    return supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
  },

  async insert(row: Pick<MembershipRow, 'user_id' | 'workspace_id' | 'role' | 'invited_by'>) {
    return supabase.from('memberships').insert({ ...row, status: 'active' });
  },
};
