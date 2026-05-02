import type { Role } from './auth-types';
import { hasPermission } from './permissions';

export interface ActorContext {
  role: Role | null;
  isSuperAdmin?: boolean;
}

export interface VideoLike {
  ownerId: string | undefined;
}

export function canDeleteVideo(actor: ActorContext, video: VideoLike, currentUserId: string | null): boolean {
  if (actor.isSuperAdmin) return true;
  if (!actor.role) return false;
  if (hasPermission(actor.role, 'video:delete-any')) return true;
  if (!currentUserId || !video.ownerId) return false;
  return video.ownerId === currentUserId && hasPermission(actor.role, 'video:delete-own');
}

export function canEditVideo(actor: ActorContext, video: VideoLike, currentUserId: string | null): boolean {
  if (actor.isSuperAdmin) return true;
  if (!actor.role) return false;
  if (hasPermission(actor.role, 'video:edit-any')) return true;
  if (!currentUserId || !video.ownerId) return false;
  return video.ownerId === currentUserId && hasPermission(actor.role, 'video:edit-own');
}
