// src/components/admin/__tests__/AddMemberModal.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AddMemberModal } from '../AddMemberModal';

afterEach(() => cleanup());

const users = [
  { id: 'u1', name: 'Alice', email: 'a@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
  { id: 'u2', name: 'Bob',   email: 'b@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
];

describe('AddMemberModal', () => {
  it('adds an existing user with a role', async () => {
    const onAddExisting = vi.fn().mockResolvedValue({ error: null });
    const onInvite = vi.fn();
    const onClose = vi.fn();
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set(['u1'])}
        onAddExisting={onAddExisting}
        onInvite={onInvite}
        onClose={onClose}
      />,
    );
    // Alice is already a member — Bob should be the selectable option
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() => expect(onAddExisting).toHaveBeenCalledWith('u2', 'admin'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('invites by email in invite mode', async () => {
    const onInvite = vi.fn().mockResolvedValue({ error: null });
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set()}
        onAddExisting={vi.fn()}
        onInvite={onInvite}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /invite by email/i }));
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'new@x.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'viewer' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(onInvite).toHaveBeenCalledWith('new@x.com', 'viewer'));
  });

  it('disables add when no selectable users exist', () => {
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set(['u1', 'u2'])}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/all users are already members/i)).toBeInTheDocument();
  });
});
