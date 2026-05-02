import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u', name: 'V', email: 'v@x', avatar: '', isSuperAdmin: false } }, logout: () => {} }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    state: { workspaces: [], allMembers: [] },
    currentWorkspace: null,
    currentRole: 'viewer',
    can: () => false,
    getUserWorkspaces: () => [],
    switchWorkspace: () => {},
    createWorkspace: () => {},
  }),
}));
vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({ state: {}, dispatch: () => {} }),
}));

describe('Sidebar gating for viewer', () => {
  it('does not show Manage, Workspace settings, Billing, or Spaces links', () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Sidebar currentWorkspaceId="" onWorkspaceChange={() => {}} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Manage/i)).toBeNull();
    expect(screen.queryByText(/Workspace settings/i)).toBeNull();
    expect(screen.queryByText(/Billing/i)).toBeNull();
    expect(screen.queryByText(/^Spaces$/i)).toBeNull();
    expect(screen.queryByText(/View all spaces/i)).toBeNull();
  });
});
