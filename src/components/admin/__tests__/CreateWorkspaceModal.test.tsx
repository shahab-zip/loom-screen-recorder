// src/components/admin/__tests__/CreateWorkspaceModal.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

afterEach(() => cleanup());
import { CreateWorkspaceModal } from '../CreateWorkspaceModal';

const users = [
  { id: 'u1', name: 'Alice', email: 'a@x.com', avatar: '', is_super_admin: true, created_at: '', last_login_at: null },
  { id: 'u2', name: 'Bob',   email: 'b@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
];

describe('CreateWorkspaceModal', () => {
  it('submits name + chosen owner', async () => {
    const onCreate = vi.fn().mockResolvedValue({ data: { id: 'w1' }, error: null });
    const onClose = vi.fn();
    render(<CreateWorkspaceModal users={users} defaultOwnerId="u1" onCreate={onCreate} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/workspace name/i), { target: { value: 'Design' } });
    fireEvent.change(screen.getByLabelText(/owner/i), { target: { value: 'u2' } });
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('u2', expect.objectContaining({ name: 'Design' })));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('disables submit when name is empty', () => {
    render(<CreateWorkspaceModal users={users} defaultOwnerId="u1" onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeDisabled();
  });

  it('shows error message when onCreate rejects', async () => {
    const onCreate = vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } });
    render(<CreateWorkspaceModal users={users} defaultOwnerId="u1" onCreate={onCreate} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/workspace name/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    await waitFor(() => expect(screen.getByText(/nope/)).toBeInTheDocument());
  });
});
