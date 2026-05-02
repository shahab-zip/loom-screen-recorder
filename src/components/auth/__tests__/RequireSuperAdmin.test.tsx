import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireSuperAdmin } from '../RequireSuperAdmin';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u', isSuperAdmin: true } } }),
}));

describe('RequireSuperAdmin', () => {
  it('renders children when user is super admin', () => {
    render(<RequireSuperAdmin><span>secret</span></RequireSuperAdmin>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
