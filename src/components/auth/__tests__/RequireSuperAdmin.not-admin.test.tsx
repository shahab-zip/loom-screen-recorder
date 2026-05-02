import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireSuperAdmin } from '../RequireSuperAdmin';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u', isSuperAdmin: false } } }),
}));

describe('RequireSuperAdmin (not admin)', () => {
  it('renders fallback when user is not super admin', () => {
    render(<RequireSuperAdmin fallback={<span>403</span>}><span>secret</span></RequireSuperAdmin>);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });
});
