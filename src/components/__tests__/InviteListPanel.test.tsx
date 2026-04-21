import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InviteListPanel } from '../InviteListPanel';

vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: {
    listByWorkspace: vi.fn().mockResolvedValue({
      data: [{ id: 'i1', email: 'a@b.com', role: 'member', status: 'pending', expires_at: new Date(Date.now()+86400000).toISOString(), token: 't', workspace_id: 'ws1', invited_by: 'u1', created_at: '' }],
      error: null,
    }),
    revoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
vi.mock('../../hooks/usePermission', () => ({ usePermission: () => true }));

describe('InviteListPanel', () => {
  it('renders pending invites', async () => {
    render(<InviteListPanel workspaceId="ws1" />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });
});
