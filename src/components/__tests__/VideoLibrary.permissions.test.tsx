import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VideoLibrary } from '../VideoLibrary';

vi.mock('../../hooks/useVideoPermissions', () => ({
  useVideoPermissions: (v: { ownerId?: string }) => ({
    canDelete: v.ownerId === 'u1',
    canEdit: v.ownerId === 'u1',
  }),
}));

vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({
    toggleWatchLater: () => {},
    isInWatchLater: () => false,
  }),
}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ can: () => true, currentRole: 'owner' }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));

const baseVideo = {
  id: 'v1',
  title: 'Mine',
  thumbnail: '',
  duration: 10,
  createdAt: new Date(),
  views: 0,
  url: '',
  workspaceId: 'w1',
  createdBy: 'u1',
};
const otherVideo = { ...baseVideo, id: 'v2', title: 'Theirs', createdBy: 'u2' };

const noop = () => {};

describe('VideoLibrary permission gating', () => {
  it('shows delete only on rows the user owns', () => {
    render(
      <MemoryRouter>
        <VideoLibrary
          videos={[baseVideo, otherVideo]}
          onVideoClick={noop}
          onNewVideo={noop}
          onDeleteVideo={noop}
          onRenameVideo={noop}
        />
      </MemoryRouter>
    );
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(1);
  });
});
