import { describe, it, expect } from 'vitest';
import { supabase } from '../supabase';

describe('supabase client', () => {
  it('exposes auth and from()', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
