import { supabase } from './supabase';
import type { Video } from './types';

export interface RemoteVideoRow {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  title: string;
  duration: number;
  thumbnail: string | null;
  public_url: string | null;
  storage_path: string | null;
  visibility: 'link' | 'workspace' | 'private';
  views: number;
  created_at: string;
}

function rowToVideo(r: RemoteVideoRow): Video {
  return {
    id: r.id,
    title: r.title,
    thumbnail: r.thumbnail ?? '',
    duration: r.duration,
    createdAt: new Date(r.created_at),
    views: r.views,
    url: r.public_url ?? '',
    workspaceId: r.workspace_id ?? 'default',
    createdBy: r.owner_id,
    publicUrl: r.public_url ?? undefined,
    visibility: r.visibility,
  };
}

/** Fetch a single video by id from Supabase. Respects RLS. */
export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToVideo(data as RemoteVideoRow);
}

/** Insert or update a video row (owner-only via RLS). */
export async function upsertVideo(v: {
  id: string;
  title: string;
  duration: number;
  thumbnail?: string;
  public_url?: string | null;
  storage_path?: string | null;
  workspace_id?: string | null;
  visibility?: 'link' | 'workspace' | 'private';
}): Promise<{ error: string | null }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: 'not authenticated' };
  const { error } = await supabase.from('videos').upsert({
    id: v.id,
    owner_id: u.user.id,
    title: v.title,
    duration: v.duration,
    thumbnail: v.thumbnail ?? '',
    public_url: v.public_url ?? null,
    storage_path: v.storage_path ?? null,
    workspace_id: v.workspace_id && v.workspace_id !== 'default' ? v.workspace_id : null,
    visibility: v.visibility ?? 'link',
  });
  return { error: error?.message ?? null };
}

/** Update visibility of an existing video row (owner-only via RLS). */
export async function updateVideoVisibility(
  id: string,
  visibility: 'link' | 'workspace' | 'private',
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('videos').update({ visibility }).eq('id', id);
  return { error: error?.message ?? null };
}

/** Increment view counter via RPC (bypasses owner-write RLS). */
export async function incrementVideoViews(id: string): Promise<void> {
  await supabase.rpc('increment_video_views', { _video_id: id });
}
