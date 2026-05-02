export type ViewType = 'all' | 'clips' | 'meetings' | 'archive';
export type SortType = 'newest' | 'oldest' | 'most-viewed';
export type CurrentView =
  | 'library'
  | 'for-you'
  | 'meetings'
  | 'watch-later'
  | 'history'
  | 'settings'
  | 'manage'
  | 'workspace-settings'
  | 'billing'
  | 'spaces'
  | 'super-admin';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  createdAt: Date;
  views: number;
  url: string;
  workspaceId: string;
  createdBy?: string;
  /** Public Supabase Storage URL — set once the recording has been uploaded for sharing. */
  publicUrl?: string;
  /** Sharing visibility — controls who can view via the share URL. */
  visibility?: 'link' | 'workspace' | 'private';
}

/** Raw shape stored in localStorage (Date serialized as string) */
export interface VideoRaw {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
  views: number;
  url: string;
  workspaceId?: string;
  createdBy?: string;
  publicUrl?: string;
  visibility?: 'link' | 'workspace' | 'private';
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

export function hydrateVideo(raw: VideoRaw): Video {
  return {
    id: raw.id,
    title: raw.title,
    thumbnail: raw.thumbnail,
    duration: raw.duration,
    createdAt: new Date(raw.createdAt),
    views: raw.views,
    url: raw.url,
    workspaceId: raw.workspaceId || 'default',
    createdBy: raw.createdBy,
    publicUrl: raw.publicUrl,
    visibility: raw.visibility,
  };
}
