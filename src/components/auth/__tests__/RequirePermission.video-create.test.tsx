import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequirePermission } from '../RequirePermission';

vi.mock('../../../hooks/usePermission', () => ({
  usePermission: (p: string) => p !== 'video:create',
}));

describe('RequirePermission for video:create', () => {
  it('hides button when permission missing', () => {
    render(
      <RequirePermission permission="video:create">
        <button>New recording</button>
      </RequirePermission>
    );
    expect(screen.queryByText('New recording')).toBeNull();
  });
});
