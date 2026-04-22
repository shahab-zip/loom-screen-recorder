// src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { WorkspaceDetailPanel } from '../WorkspaceDetailPanel';

afterEach(() => cleanup());

const ws = { id: 'w1', name: 'Design', description: '', color: '#625DF5', created_by: 'u1', settings: {}, created_at: '2026-01-01T00:00:00Z' };
const users = [
  { id: 'u1', name: 'Alice', email: 'a@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
  { id: 'u2', name: 'Bob',   email: 'b@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
];

describe('WorkspaceDetailPanel', () => {
  it('lists members and supports role change and removal', async () => {
    const memberships = [
      { user_id: 'u1', workspace_id: 'w1', role: 'owner',  status: 'active', invited_by: null, joined_at: '', profiles: users[0] },
      { user_id: 'u2', workspace_id: 'w1', role: 'member', status: 'active', invited_by: 'u1', joined_at: '', profiles: users[1] },
    ];
    const loadMembers  = vi.fn().mockResolvedValue({ data: memberships, error: null });
    const loadInvites  = vi.fn().mockResolvedValue({ data: [], error: null });
    const setRole      = vi.fn().mockResolvedValue({ error: null });
    const removeMember = vi.fn().mockResolvedValue({ error: null });

    render(
      <WorkspaceDetailPanel
        workspace={ws}
        users={users}
        onBack={vi.fn()}
        loadMembers={loadMembers}
        loadInvites={loadInvites}
        onSetRole={setRole}
        onRemoveMember={removeMember}
        onRevokeInvite={vi.fn()}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Change Bob to admin
    const bobRow = screen.getByText('Bob').closest('tr')!;
    const select = bobRow.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'admin' } });
    await waitFor(() => expect(setRole).toHaveBeenCalledWith('u2', 'admin'));

    // Remove Bob
    const removeBtn = bobRow.querySelector('button[title="Remove member"]')!;
    // jsdom window.confirm auto-confirms via stub
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(removeBtn);
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('u2'));
    confirmSpy.mockRestore();
  });

  it('blocks removal of the last owner', async () => {
    const memberships = [
      { user_id: 'u1', workspace_id: 'w1', role: 'owner', status: 'active', invited_by: null, joined_at: '', profiles: users[0] },
    ];
    const removeMember = vi.fn();
    render(
      <WorkspaceDetailPanel
        workspace={ws}
        users={users}
        onBack={vi.fn()}
        loadMembers={vi.fn().mockResolvedValue({ data: memberships, error: null })}
        loadInvites={vi.fn().mockResolvedValue({ data: [], error: null })}
        onSetRole={vi.fn()}
        onRemoveMember={removeMember}
        onRevokeInvite={vi.fn()}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    const row = screen.getByText('Alice').closest('tr')!;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(row.querySelector('button[title="Remove member"]')!);
    expect(removeMember).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/last owner/i));
    alertSpy.mockRestore();
  });
});
