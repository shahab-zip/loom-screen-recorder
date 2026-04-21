import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteMemberModal } from '../InviteMemberModal';

vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: { create: vi.fn().mockResolvedValue({ data: { id: 'i1', token: 'tok' }, error: null }) },
}));
vi.mock('../../hooks/useCurrentRole', () => ({ useCurrentRole: () => 'admin' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }) }));

describe('InviteMemberModal', () => {
  it('creates an invite on submit', async () => {
    const onClose = vi.fn();
    render(<InviteMemberModal workspaceId="ws1" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByText(/send invite/i));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const { invitesRepo } = await import('../../lib/repos/invites');
    expect(invitesRepo.create).toHaveBeenCalledWith({ workspaceId: 'ws1', email: 'a@b.com', role: 'member', invitedBy: 'u1' });
  });
});
