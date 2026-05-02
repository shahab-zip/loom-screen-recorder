import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RequireSuperAdmin } from '../RequireSuperAdmin';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: null } }),
}));

describe('RequireSuperAdmin (no user)', () => {
  it('renders nothing when not super admin and no fallback', () => {
    const { container } = render(<RequireSuperAdmin><span>secret</span></RequireSuperAdmin>);
    expect(container.firstChild).toBeNull();
  });
});
