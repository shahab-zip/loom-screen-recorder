import { describe, it, expect } from 'vitest';
import { canDeleteVideo, canEditVideo } from '../video-permissions';
import type { Role } from '../auth-types';

const make = (role: Role | null, isSuper = false) => ({ role, isSuperAdmin: isSuper });

describe('canDeleteVideo', () => {
  it('owner can delete own video', () => {
    expect(canDeleteVideo(make('owner'), { ownerId: 'u1' }, 'u1')).toBe(true);
  });
  it('member can delete own video', () => {
    expect(canDeleteVideo(make('member'), { ownerId: 'u1' }, 'u1')).toBe(true);
  });
  it('member cannot delete other user video', () => {
    expect(canDeleteVideo(make('member'), { ownerId: 'u2' }, 'u1')).toBe(false);
  });
  it('admin can delete any video in workspace', () => {
    expect(canDeleteVideo(make('admin'), { ownerId: 'u2' }, 'u1')).toBe(true);
  });
  it('viewer cannot delete anything', () => {
    expect(canDeleteVideo(make('viewer'), { ownerId: 'u1' }, 'u1')).toBe(false);
  });
  it('null role cannot delete', () => {
    expect(canDeleteVideo(make(null), { ownerId: 'u1' }, 'u1')).toBe(false);
  });
  it('super admin always wins', () => {
    expect(canDeleteVideo(make(null, true), { ownerId: 'u2' }, 'u1')).toBe(true);
  });
});

describe('canEditVideo', () => {
  it('member can edit own', () => {
    expect(canEditVideo(make('member'), { ownerId: 'u1' }, 'u1')).toBe(true);
  });
  it('member cannot edit others', () => {
    expect(canEditVideo(make('member'), { ownerId: 'u2' }, 'u1')).toBe(false);
  });
  it('admin can edit any', () => {
    expect(canEditVideo(make('admin'), { ownerId: 'u2' }, 'u1')).toBe(true);
  });
  it('viewer cannot edit', () => {
    expect(canEditVideo(make('viewer'), { ownerId: 'u1' }, 'u1')).toBe(false);
  });
});
