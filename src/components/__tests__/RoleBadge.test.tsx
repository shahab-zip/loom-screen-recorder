import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';

describe('RoleBadge', () => {
  it('shows role label', () => {
    render(<RoleBadge role="owner" />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });
});
