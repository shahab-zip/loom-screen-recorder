import { supabase } from '../supabase';

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  color: string;
  created_by: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export const workspacesRepo = {
  async listMine() {
    return supabase.from('workspaces').select('*').order('created_at', { ascending: true });
  },

  async getById(id: string) {
    return supabase.from('workspaces').select('*').eq('id', id).single<WorkspaceRow>();
  },

  async create(input: { name: string; description?: string; color?: string }) {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { data: null, error: new Error('not authenticated') };

    const wsRes = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        description: input.description ?? '',
        color: input.color ?? '#625DF5',
        created_by: userRes.user.id,
        settings: {},
      })
      .select()
      .single<WorkspaceRow>();

    if (wsRes.error || !wsRes.data) return wsRes;

    const memRes = await supabase.from('memberships').insert({
      user_id: userRes.user.id,
      workspace_id: wsRes.data.id,
      role: 'owner',
      status: 'active',
      invited_by: null,
    });

    if (memRes.error) return { data: null, error: memRes.error };
    return wsRes;
  },

  /**
   * Super-admin helper: create a workspace attributed to an arbitrary owner
   * and seed the matching owner membership atomically via the
   * `create_workspace_as` RPC (security definer, super-admin only).
   */
  async createAs(
    ownerId: string,
    input: { name: string; description?: string; color?: string },
  ) {
    const { data, error } = await supabase.rpc('create_workspace_as', {
      _owner_id: ownerId,
      _name: input.name,
      _description: input.description ?? '',
      _color: input.color ?? '#625DF5',
    });
    return { data: data as WorkspaceRow | null, error };
  },

  async update(id: string, patch: Partial<Pick<WorkspaceRow, 'name' | 'description' | 'color' | 'settings'>>) {
    return supabase.from('workspaces').update(patch).eq('id', id).select().single<WorkspaceRow>();
  },

  async remove(id: string) {
    return supabase.from('workspaces').delete().eq('id', id);
  },

  /**
   * Super-admin view: lists every workspace plus a memberships row count.
   * Relies on RLS allowing super admins to see all workspaces.
   */
  async listAllWithCounts() {
    return supabase
      .from('workspaces')
      .select('*, memberships(user_id)')
      .order('created_at', { ascending: false });
  },
};
