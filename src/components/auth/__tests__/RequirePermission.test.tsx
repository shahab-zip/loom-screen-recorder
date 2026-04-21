import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequirePermission } from '../RequirePermission';

vi.mock('../../../hooks/usePermission', () => ({ usePermission: (p: string) => p === 'video:view' }));

describe('RequirePermission', () => {
  it('renders children when allowed', () => {
    render(<RequirePermission permission="video:view"><span>ok</span></RequirePermission>);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
  it('renders fallback when denied', () => {
    render(<RequirePermission permission="workspace:delete" fallback={<span>nope</span>}><span>ok</span></RequirePermission>);
    expect(screen.getByText('nope')).toBeInTheDocument();
  });
});
