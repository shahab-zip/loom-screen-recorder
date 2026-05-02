import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { canDeleteVideo, canEditVideo, type VideoLike } from '../lib/video-permissions';

export function useVideoPermissions(video: VideoLike) {
  const { state: authState } = useAuth();
  const { currentRole } = useWorkspace();
  const actor = {
    role: currentRole,
    isSuperAdmin: authState.currentUser?.isSuperAdmin ?? false,
  };
  const userId = authState.currentUser?.id ?? null;
  return {
    canDelete: canDeleteVideo(actor, video, userId),
    canEdit: canEditVideo(actor, video, userId),
  };
}
