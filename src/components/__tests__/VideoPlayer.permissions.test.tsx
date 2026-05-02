import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

vi.mock('../../hooks/useVideoPermissions', () => ({
  useVideoPermissions: (v: { ownerId?: string }) => ({
    canDelete: v.ownerId === 'u1',
    canEdit: v.ownerId === 'u1',
  }),
}));
vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({ ensurePublicUrl: async () => ({ url: null, error: null }) }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentRole: 'viewer' }),
}));

const otherVideo = {
  id: 'v1', title: 'Theirs', thumbnail: '', duration: 10,
  createdAt: new Date(), views: 0, url: '', workspaceId: 'w1', createdBy: 'u2',
};

describe('VideoPlayer permission gating', () => {
  it('hides delete button for non-owner without delete-any', () => {
    render(
      <VideoPlayer
        video={otherVideo}
        onClose={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        toggleWatchLater={() => {}}
        isInWatchLater={() => false}
      />
    );
    // Open the "more" overflow menu where Rename/Delete live
    const moreBtns = screen.getAllByRole('button');
    const moreBtn = moreBtns.find(b => b.querySelector('.lucide-ellipsis'));
    if (moreBtn) fireEvent.click(moreBtn);
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
