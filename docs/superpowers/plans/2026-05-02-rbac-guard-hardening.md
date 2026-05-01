# RBAC Guard Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining permission-guard gaps in the existing 4-role RBAC system so every privileged route and action is gated end-to-end (UI + context + repo).

**Architecture:** The codebase already has a complete RBAC foundation: a `Role`/`Permission` catalog (`src/lib/auth-types.ts`), permission resolver (`src/lib/permissions.ts`), `usePermission` hook, `RouteGuard`/`RequirePermission`/`RequireRole` components, `WorkspaceContext.can(permission)`, super-admin RPCs, and a last-owner DB trigger. RLS enforces the server-side boundary. This plan adds **client-side guards on the remaining unprotected surfaces**: super-admin route, video delete/rename actions, "new recording" trigger, and `createWorkspace` viewer-block. We treat client guards as UX polish — RLS is the source of truth — but we want the UI to never present an action the user cannot complete.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library, Tailwind, Supabase (already wired).

**Pre-existing assets (do NOT rebuild):**
- `src/lib/auth-types.ts` — `Role`, `Permission`, `ROLE_HIERARCHY`, `ROLE_LABELS`
- `src/lib/permissions.ts` — `hasPermission`, `canManageRole`, `getAssignableRoles`
- `src/hooks/usePermission.ts` — returns `boolean`
- `src/components/auth/RouteGuard.tsx` — view-level gate (renders fallback or null)
- `src/components/auth/RequirePermission.tsx` — inline gate
- `src/components/auth/RequireRole.tsx` — role-minimum gate
- `src/contexts/WorkspaceContext.tsx` — exposes `can(permission)`, `currentRole`, all CRUD
- `src/contexts/AuthContext.tsx` — exposes `currentUser.isSuperAdmin`
- DB: RLS, `create_workspace_as` RPC, `ensure_workspace_has_owner_trg`

**File-touch map:**
- Modify `src/App.tsx` — add `<RouteGuard>` around super-admin case
- Modify `src/contexts/WorkspaceContext.tsx` — add viewer-block in `createWorkspace`
- Modify `src/components/VideoLibrary.tsx` — gate delete/rename buttons per-video
- Modify `src/components/VideoPlayer.tsx` — gate delete/rename actions
- Create `src/lib/video-permissions.ts` — `canDeleteVideo`, `canEditVideo` helpers (own vs. any)
- Create `src/lib/__tests__/video-permissions.test.ts`
- Create `src/components/auth/__tests__/RouteGuard.superadmin.test.tsx`
- Create `src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx`
- Modify `src/components/__tests__/VideoLibrary.test.tsx` (or add new) — assert delete button is hidden for viewers and for non-owners without `video:delete-any`
- Modify `src/components/RecordingControls.tsx` and/or call sites of `openRecordingModal` — the recording trigger button should be hidden for viewers (no `video:create`)

---

## Pre-flight

- [ ] **Step 0.1: Create worktree branch**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design"
git checkout -b rbac-guard-hardening
```

- [ ] **Step 0.2: Verify baseline tests pass**

Run: `npm test -- --run`
Expected: all suites pass (this is your green baseline).

If anything is red on main, stop and surface to the user before proceeding.

---

### Task 1: `canDeleteVideo` / `canEditVideo` helpers

The current permission catalog distinguishes `video:delete-own` vs `video:delete-any` (and same for edit), but no helper combines that with ownership. Centralize the rule so call sites stay simple.

**Files:**
- Create: `src/lib/video-permissions.ts`
- Test: `src/lib/__tests__/video-permissions.test.ts`

- [ ] **Step 1.1: Write the failing test**

```ts
// src/lib/__tests__/video-permissions.test.ts
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
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npm test -- --run src/lib/__tests__/video-permissions.test.ts`
Expected: FAIL — `Cannot find module '../video-permissions'`.

- [ ] **Step 1.3: Implement helpers**

```ts
// src/lib/video-permissions.ts
import type { Role } from './auth-types';
import { hasPermission } from './permissions';

export interface ActorContext {
  role: Role | null;
  isSuperAdmin?: boolean;
}

export interface VideoLike {
  ownerId: string | undefined;
}

export function canDeleteVideo(actor: ActorContext, video: VideoLike, currentUserId: string | null): boolean {
  if (actor.isSuperAdmin) return true;
  if (!actor.role) return false;
  if (hasPermission(actor.role, 'video:delete-any')) return true;
  if (!currentUserId || !video.ownerId) return false;
  return video.ownerId === currentUserId && hasPermission(actor.role, 'video:delete-own');
}

export function canEditVideo(actor: ActorContext, video: VideoLike, currentUserId: string | null): boolean {
  if (actor.isSuperAdmin) return true;
  if (!actor.role) return false;
  if (hasPermission(actor.role, 'video:edit-any')) return true;
  if (!currentUserId || !video.ownerId) return false;
  return video.ownerId === currentUserId && hasPermission(actor.role, 'video:edit-own');
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `npm test -- --run src/lib/__tests__/video-permissions.test.ts`
Expected: 10/10 PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/video-permissions.ts src/lib/__tests__/video-permissions.test.ts
git commit -m "feat(rbac): add canDeleteVideo/canEditVideo helpers with ownership"
```

---

### Task 2: Hook for video-action permission

Wrap Task 1 helpers in a hook that pulls `currentRole`, `isSuperAdmin`, and `currentUser.id` out of context — keeps call sites one-liner.

**Files:**
- Create: `src/hooks/useVideoPermissions.ts`
- Test: `src/hooks/__tests__/useVideoPermissions.test.tsx`

- [ ] **Step 2.1: Write the failing test**

```tsx
// src/hooks/__tests__/useVideoPermissions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoPermissions } from '../useVideoPermissions';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentRole: 'member' }),
}));

describe('useVideoPermissions', () => {
  it('member can delete/edit own', () => {
    const { result } = renderHook(() => useVideoPermissions({ ownerId: 'u1' }));
    expect(result.current.canDelete).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });
  it('member cannot delete/edit others', () => {
    const { result } = renderHook(() => useVideoPermissions({ ownerId: 'u2' }));
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/__tests__/useVideoPermissions.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement hook**

```ts
// src/hooks/useVideoPermissions.ts
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { canDeleteVideo, canEditVideo, type VideoLike } from '../lib/video-permissions';

export function useVideoPermissions(video: VideoLike) {
  const { state: authState } = useAuth();
  const { currentRole } = useWorkspace();
  const actor = {
    role: currentRole,
    isSuperAdmin: authState.currentUser?.isSuperAdmin ?? false,
  };
  const userId = authState.currentUser?.id ?? null;
  return {
    canDelete: canDeleteVideo(actor, video, userId),
    canEdit: canEditVideo(actor, video, userId),
  };
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/__tests__/useVideoPermissions.test.tsx`
Expected: 2/2 PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/hooks/useVideoPermissions.ts src/hooks/__tests__/useVideoPermissions.test.tsx
git commit -m "feat(rbac): useVideoPermissions hook for ownership-aware checks"
```

---

### Task 3: Gate delete/rename in `VideoLibrary`

The library currently shows delete & rename icons unconditionally on every row (grid + list views). Hide them when the current user can't perform the action.

**Files:**
- Modify: `src/components/VideoLibrary.tsx` (rename buttons ~line 335, ~line 452; delete buttons ~line 355, ~line 468)
- Test: `src/components/__tests__/VideoLibrary.permissions.test.tsx` (new)

- [ ] **Step 3.1: Write the failing test**

```tsx
// src/components/__tests__/VideoLibrary.permissions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoLibrary } from '../VideoLibrary';

vi.mock('../../hooks/useVideoPermissions', () => ({
  useVideoPermissions: (v: { ownerId?: string }) => ({
    canDelete: v.ownerId === 'u1',
    canEdit: v.ownerId === 'u1',
  }),
}));

const baseVideo = {
  id: 'v1',
  title: 'Mine',
  thumbnail: '',
  duration: 10,
  createdAt: new Date(),
  views: 0,
  url: '',
  workspaceId: 'w1',
  createdBy: 'u1',
};
const otherVideo = { ...baseVideo, id: 'v2', title: 'Theirs', createdBy: 'u2' };

const noop = () => {};

describe('VideoLibrary permission gating', () => {
  it('shows delete only on rows the user owns', () => {
    render(
      <VideoLibrary
        videos={[baseVideo, otherVideo]}
        onVideoClick={noop}
        onNewVideo={noop}
        onDeleteVideo={noop}
        onRenameVideo={noop}
        viewType="all"
        onViewTypeChange={noop}
        sortType="newest"
        onSortTypeChange={noop}
      />
    );
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(1);
  });
});
```

NOTE: Adapter — `VideoLibrary` reads `video.createdBy`, but the helpers expect `ownerId`. Pass `{ ownerId: video.createdBy }` to the hook in step 3.2.

- [ ] **Step 3.2: Run test to verify it fails**

Run: `npm test -- --run src/components/__tests__/VideoLibrary.permissions.test.tsx`
Expected: FAIL — finds 2 delete buttons (un-gated).

- [ ] **Step 3.3: Wire the hook into rows**

Open `src/components/VideoLibrary.tsx`. Inside the row-render loop (both grid and list), wrap rename/delete buttons:

```tsx
// Add at top of file
import { useVideoPermissions } from '../hooks/useVideoPermissions';

// Refactor the row to a small component so the hook is called once per row:
function VideoRowActions({ video, onRename, onDelete }: {
  video: { id: string; createdBy?: string };
  onRename: () => void;
  onDelete: () => void;
}) {
  const { canEdit, canDelete } = useVideoPermissions({ ownerId: video.createdBy });
  return (
    <>
      {canEdit && (
        <button aria-label="Rename" onClick={onRename} className="...existing classes...">
          {/* existing rename icon */}
        </button>
      )}
      {canDelete && (
        <button aria-label="Delete" onClick={onDelete} className="...existing classes...">
          {/* existing delete icon */}
        </button>
      )}
    </>
  );
}
```

Then replace both inline button blocks in the grid view (~lines 335-360) and list view (~lines 452-475) with `<VideoRowActions video={video} onRename={() => handleRename(video)} onDelete={() => handleDelete(video.id)} />`.

Preserve the existing `aria-label`s the tests expect (they default to `/delete/i`). If the existing buttons used different labels, add explicit `aria-label="Delete"` and `aria-label="Rename"` attributes.

- [ ] **Step 3.4: Run test to verify it passes**

Run: `npm test -- --run src/components/__tests__/VideoLibrary.permissions.test.tsx`
Expected: PASS — 1 delete button visible.

- [ ] **Step 3.5: Run full library test file to ensure no regression**

Run: `npm test -- --run src/components/__tests__/VideoLibrary`
Expected: all VideoLibrary tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/VideoLibrary.tsx src/components/__tests__/VideoLibrary.permissions.test.tsx
git commit -m "feat(rbac): gate VideoLibrary rename/delete by ownership"
```

---

### Task 4: Gate delete/rename in `VideoPlayer`

`VideoPlayer.tsx` exposes a rename-on-title-click flow (line 312) and a delete button. Apply the same hook.

**Files:**
- Modify: `src/components/VideoPlayer.tsx` (around the title-edit handler and delete button)
- Test: `src/components/__tests__/VideoPlayer.permissions.test.tsx` (new)

- [ ] **Step 4.1: Write the failing test**

```tsx
// src/components/__tests__/VideoPlayer.permissions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

vi.mock('../../hooks/useVideoPermissions', () => ({
  useVideoPermissions: (v: { ownerId?: string }) => ({
    canDelete: v.ownerId === 'u1',
    canEdit: v.ownerId === 'u1',
  }),
}));
vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({ ensurePublicUrl: async () => ({ url: null, error: null }) }),
}));

const otherVideo = {
  id: 'v1', title: 'Theirs', thumbnail: '', duration: 10,
  createdAt: new Date(), views: 0, url: '', workspaceId: 'w1', createdBy: 'u2',
};

describe('VideoPlayer permission gating', () => {
  it('hides delete button for non-owner without delete-any', () => {
    render(
      <VideoPlayer
        video={otherVideo}
        onClose={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        toggleWatchLater={() => {}}
        isInWatchLater={false}
      />
    );
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `npm test -- --run src/components/__tests__/VideoPlayer.permissions.test.tsx`
Expected: FAIL — delete button still rendered.

- [ ] **Step 4.3: Wire the hook into VideoPlayer**

In `src/components/VideoPlayer.tsx`:

```tsx
import { useVideoPermissions } from '../hooks/useVideoPermissions';

// Inside the component, near top:
const { canDelete, canEdit } = useVideoPermissions({ ownerId: video.createdBy });
```

Then:
1. Wrap the delete button JSX with `{canDelete && (...)}`.
2. Guard the rename trigger: when `canEdit` is false, the title click handler should not enter edit mode (e.g. `onClick={() => { if (canEdit) startEdit(); }}`) and the title should not show a hover affordance.
3. Ensure the delete button has `aria-label="Delete"`.

- [ ] **Step 4.4: Run test to verify it passes**

Run: `npm test -- --run src/components/__tests__/VideoPlayer.permissions.test.tsx`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/VideoPlayer.tsx src/components/__tests__/VideoPlayer.permissions.test.tsx
git commit -m "feat(rbac): gate VideoPlayer rename/delete by ownership"
```

---

### Task 5: Gate the "+ New recording" trigger by `video:create`

Viewers should not see the recording-modal opener. The button appears in `ForYou`, `VideoLibrary` (empty state, ~line 111 and ~line 243), `Meetings`, `WatchLater`, `History`, `Settings`. The cleanest fix is a wrapper component.

**Files:**
- Create: `src/components/auth/CanRecordButton.tsx` (and re-export the `RequirePermission` wrapper if simpler)
- Modify (call sites): just wrap each `<button onClick={onNewVideo}>…</button>` in `<RequirePermission permission="video:create">…</RequirePermission>` — already exists.
- Test: `src/components/auth/__tests__/RequirePermission.video-create.test.tsx`

- [ ] **Step 5.1: Write the failing test (asserts viewer doesn't see button)**

```tsx
// src/components/auth/__tests__/RequirePermission.video-create.test.tsx
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
```

- [ ] **Step 5.2: Run test to verify it passes (existing component already correct)**

Run: `npm test -- --run src/components/auth/__tests__/RequirePermission.video-create.test.tsx`
Expected: PASS — `RequirePermission` already does the right thing. This step is a regression-lock test.

- [ ] **Step 5.3: Wrap call sites**

Touch these files; each has one or two "New recording" buttons. Wrap each:

```tsx
import { RequirePermission } from './auth/RequirePermission';

<RequirePermission permission="video:create">
  <button onClick={onNewVideo} className="...existing...">+ New recording</button>
</RequirePermission>
```

Files to modify:
- `src/components/VideoLibrary.tsx` (lines ~111 and ~243)
- `src/components/ForYou.tsx`
- `src/components/Meetings.tsx`
- `src/components/WatchLater.tsx`
- `src/components/History.tsx`
- `src/components/Homepage.tsx` (if it has a record CTA)
- `src/components/Sidebar.tsx` (if there is a record button there — check around the workspace switcher)

For each file, run: `grep -n "onNewVideo\|+ New recording\|New recording" <file>` to locate the right element, then wrap.

- [ ] **Step 5.4: Run full test suite**

Run: `npm test -- --run`
Expected: all PASS. If a snapshot/test broke because of new wrapper, update the test mock to grant the permission.

- [ ] **Step 5.5: Commit**

```bash
git add src/components src/components/auth/__tests__/RequirePermission.video-create.test.tsx
git commit -m "feat(rbac): gate '+ New recording' triggers by video:create"
```

---

### Task 6: Guard the super-admin route in `App.tsx`

Currently `case 'super-admin':` returns `<SuperAdminPanel />` with no guard. The sidebar nav item is hidden for non-super-admins, but state-restored or programmatic navigation still reaches the panel.

**Files:**
- Modify: `src/App.tsx` (line 211-212)
- Create: `src/components/auth/RequireSuperAdmin.tsx`
- Test: `src/components/auth/__tests__/RequireSuperAdmin.test.tsx`

- [ ] **Step 6.1: Write the failing test**

```tsx
// src/components/auth/__tests__/RequireSuperAdmin.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireSuperAdmin } from '../RequireSuperAdmin';

const mockAuth = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

describe('RequireSuperAdmin', () => {
  it('renders children when user is super admin', () => {
    mockAuth.mockReturnValue({ state: { currentUser: { id: 'u', isSuperAdmin: true } } });
    render(<RequireSuperAdmin><span>secret</span></RequireSuperAdmin>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
  it('renders fallback when user is not super admin', () => {
    mockAuth.mockReturnValue({ state: { currentUser: { id: 'u', isSuperAdmin: false } } });
    render(<RequireSuperAdmin fallback={<span>403</span>}><span>secret</span></RequireSuperAdmin>);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });
  it('renders nothing when not super admin and no fallback', () => {
    mockAuth.mockReturnValue({ state: { currentUser: null } });
    const { container } = render(<RequireSuperAdmin><span>secret</span></RequireSuperAdmin>);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `npm test -- --run src/components/auth/__tests__/RequireSuperAdmin.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement component**

```tsx
// src/components/auth/RequireSuperAdmin.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function RequireSuperAdmin({
  children,
  fallback = null,
}: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { state } = useAuth();
  return state.currentUser?.isSuperAdmin ? <>{children}</> : <>{fallback}</>;
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `npm test -- --run src/components/auth/__tests__/RequireSuperAdmin.test.tsx`
Expected: 3/3 PASS.

- [ ] **Step 6.5: Wire into App.tsx**

Edit `src/App.tsx`:

```tsx
// Add import near other auth imports:
import { RequireSuperAdmin } from './components/auth/RequireSuperAdmin';

// Replace the super-admin case (line 211-212):
case 'super-admin':
  return (
    <RequireSuperAdmin fallback={<div className="p-8 text-gray-600">You don't have access to this page.</div>}>
      <SuperAdminPanel />
    </RequireSuperAdmin>
  );
```

- [ ] **Step 6.6: Run full test suite**

Run: `npm test -- --run`
Expected: all PASS.

- [ ] **Step 6.7: Commit**

```bash
git add src/App.tsx src/components/auth/RequireSuperAdmin.tsx src/components/auth/__tests__/RequireSuperAdmin.test.tsx
git commit -m "feat(rbac): guard super-admin route with RequireSuperAdmin"
```

---

### Task 7: Block viewer from `createWorkspace` in `WorkspaceContext`

`createWorkspace` calls `workspacesRepo.create` regardless of role; RLS may or may not reject (it depends on the table policy — but the UI shouldn't even attempt). Add a defensive client check that mirrors `hasPermission(role, 'workspace:create')`.

**Files:**
- Modify: `src/contexts/WorkspaceContext.tsx` (around line 286-298)
- Create: `src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx`

- [ ] **Step 7.1: Write the failing test**

```tsx
// src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { WorkspaceProvider, useWorkspace } from '../WorkspaceContext';

const createMock = vi.fn();
vi.mock('../../lib/repos/workspaces', () => ({
  workspacesRepo: {
    create: (...args: unknown[]) => createMock(...args),
    listMine: async () => ({ data: [], error: null }),
    update: async () => ({ data: null, error: null }),
    remove: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../../lib/repos/memberships', () => ({
  membershipsRepo: {
    listForUser: async () => ({ data: [{ user_id: 'u1', workspace_id: 'w1', role: 'viewer', joined_at: '', invited_by: null, status: 'active' }], error: null }),
    listByWorkspace: async () => ({ data: [], error: null }),
    setRole: async () => ({ data: null, error: null }),
    remove: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: {
    listByWorkspace: async () => ({ data: [], error: null }),
    create: async () => ({ data: null, error: null }),
    revoke: async () => ({ data: null, error: null }),
  },
}));
vi.mock('../AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }),
}));

let api: ReturnType<typeof useWorkspace>;
function Probe() {
  api = useWorkspace();
  return null;
}

describe('createWorkspace permission guard', () => {
  it('returns null and does not call repo when role is viewer', async () => {
    createMock.mockResolvedValue({ data: null, error: null });
    await act(async () => {
      render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    });
    let result: unknown;
    await act(async () => {
      result = await api.createWorkspace('Test', '', '#000');
    });
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `npm test -- --run src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx`
Expected: FAIL — `createMock` was called (current code has no guard).

- [ ] **Step 7.3: Add guard**

Edit `src/contexts/WorkspaceContext.tsx`. Replace the body of `createWorkspace` (lines 286-298):

```tsx
const createWorkspace = useCallback(async (name: string, description: string, color: string): Promise<AuthWorkspace | null> => {
  // Permission guard: viewers cannot create workspaces. Super admins bypass.
  const isSuper = authState.currentUser?.isSuperAdmin ?? false;
  if (!isSuper) {
    if (!currentRole || !hasPermission(currentRole, 'workspace:create')) {
      return null;
    }
  }

  const { data, error } = await workspacesRepo.create({ name, description, color });
  if (error || !data) return null;
  const ws = toAuthWorkspace(data);

  if (authState.currentUser) {
    await refreshWorkspaces(authState.currentUser.id);
    await refreshMemberships(authState.currentUser.id);
  }

  dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: ws.id });
  return ws;
}, [authState.currentUser, currentRole]);
```

(`hasPermission` is already imported at the top of the file.)

- [ ] **Step 7.4: Run test to verify it passes**

Run: `npm test -- --run src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx`
Expected: PASS.

- [ ] **Step 7.5: Run full suite to confirm no regressions**

Run: `npm test -- --run`
Expected: all PASS.

- [ ] **Step 7.6: Commit**

```bash
git add src/contexts/WorkspaceContext.tsx src/contexts/__tests__/WorkspaceContext.createWorkspace.test.tsx
git commit -m "feat(rbac): block viewer from createWorkspace at context layer"
```

---

### Task 8: Hide "New workspace" button from viewers in UI

Same protection at the UI layer for the workspace-create CTA (sidebar / Workspaces page).

**Files:**
- Modify: `src/components/Workspaces.tsx` (locate the create-workspace button)
- Modify: `src/components/Sidebar.tsx` (if it has a "New workspace" affordance)

- [ ] **Step 8.1: Locate create button**

Run: `grep -n "createWorkspace\|New workspace\|+ Workspace" src/components/Workspaces.tsx src/components/Sidebar.tsx`

- [ ] **Step 8.2: Wrap with `RequirePermission`**

For each create-workspace button found, wrap:

```tsx
import { RequirePermission } from './auth/RequirePermission';

<RequirePermission permission="workspace:create">
  <button onClick={openCreateModal} className="...existing...">+ New workspace</button>
</RequirePermission>
```

- [ ] **Step 8.3: Run full test suite**

Run: `npm test -- --run`
Expected: all PASS. If existing tests render Workspaces with a viewer mock and assert presence of the create button, update them to mock the role appropriately.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/Workspaces.tsx src/components/Sidebar.tsx
git commit -m "feat(rbac): hide create-workspace UI from viewers"
```

---

### Task 9: Permission-aware Sidebar nav items

Make sure Settings → Manage / Workspace settings / Billing / Spaces nav links only render when the user has the gating permission. The Sidebar already imports `RequirePermission` and uses it for at least one item; audit every nav item against its `RouteGuard` permission in `App.tsx`.

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Test: `src/components/__tests__/Sidebar.permissions.test.tsx` (new)

Mapping (must match App.tsx):
| Nav id | Required permission |
|---|---|
| `for-you` / `library` / `meetings` / `watch-later` / `history` | `video:view` |
| `manage` | `member:view` |
| `workspace-settings` | `workspace:view-settings` |
| `billing` | `workspace:view-billing` |
| `spaces` | `space:create` |
| `super-admin` | (super admin only — already gated) |

- [ ] **Step 9.1: Write the failing test**

```tsx
// src/components/__tests__/Sidebar.permissions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u', name: 'V', email: 'v@x', avatar: '', isSuperAdmin: false } }, logout: () => {} }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    state: { workspaces: [], allMembers: [] },
    currentWorkspace: null,
    currentRole: 'viewer',
    can: () => false,
  }),
}));

describe('Sidebar gating for viewer', () => {
  it('does not show Manage, Workspace settings, Billing, or Spaces links', () => {
    render(<Sidebar currentView="library" onViewChange={() => {}} currentWorkspaceId="" onWorkspaceChange={() => {}} />);
    expect(screen.queryByText(/Manage/i)).toBeNull();
    expect(screen.queryByText(/Workspace settings/i)).toBeNull();
    expect(screen.queryByText(/Billing/i)).toBeNull();
    expect(screen.queryByText(/Spaces/i)).toBeNull();
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails (or passes if already gated)**

Run: `npm test -- --run src/components/__tests__/Sidebar.permissions.test.tsx`
Expected: most likely FAIL on at least one of the four labels.

- [ ] **Step 9.3: Wrap missing nav items**

Open `src/components/Sidebar.tsx`. For each `<NavItem>` whose route requires a permission, wrap with `<RequirePermission permission="...">`. Example pattern:

```tsx
<RequirePermission permission="member:view">
  <NavItem id="manage" label="Manage" icon={Users} />
</RequirePermission>
<RequirePermission permission="workspace:view-settings">
  <NavItem id="workspace-settings" label="Workspace settings" icon={Settings} />
</RequirePermission>
<RequirePermission permission="workspace:view-billing">
  <NavItem id="billing" label="Billing" icon={CreditCard} />
</RequirePermission>
<RequirePermission permission="space:create">
  <NavItem id="spaces" label="Spaces" icon={Folder} />
</RequirePermission>
```

(The super-admin item is already isSuperAdmin-gated. Leave it.)

- [ ] **Step 9.4: Run test to verify it passes**

Run: `npm test -- --run src/components/__tests__/Sidebar.permissions.test.tsx`
Expected: PASS.

- [ ] **Step 9.5: Run full suite**

Run: `npm test -- --run`
Expected: all PASS.

- [ ] **Step 9.6: Commit**

```bash
git add src/components/Sidebar.tsx src/components/__tests__/Sidebar.permissions.test.tsx
git commit -m "feat(rbac): permission-gate sidebar nav items"
```

---

### Task 10: Final integration sweep + manual smoke

- [ ] **Step 10.1: Run full test suite**

Run: `npm test -- --run`
Expected: all PASS.

- [ ] **Step 10.2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10.3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 10.4: Manual smoke test (write to checklist below as you verify)**

Use the deployed app or `npm run dev`. Sign in as each role and confirm:

- [ ] Viewer: no "+ New recording" button anywhere; no rename/delete on any video; no "Manage", "Workspace settings", "Billing", "Spaces" sidebar items; no "New workspace" CTA; navigating to `/super-admin` (or setting `currentView=super-admin`) shows the 403 fallback.
- [ ] Member: can record; can rename/delete own videos only; can see Manage; cannot see Billing.
- [ ] Admin: can record; can rename/delete any video in workspace; can see Manage, Workspace settings, Billing.
- [ ] Owner: same as admin plus can delete the workspace.
- [ ] Super admin: super-admin route renders; can create workspaces and assign owners.

- [ ] **Step 10.5: Final commit (if any cleanup) and push**

```bash
git status
# If clean, skip; else commit cleanup.
git push -u origin rbac-guard-hardening
```

- [ ] **Step 10.6: Open PR via existing GitHub flow**

User to open PR on GitHub once SSH push works.

---

## Self-Review Notes

- **Spec coverage:** user spec named "user roles (admin, member, viewer)" — codebase already has all three plus `owner`, kept for backward compatibility (owner = admin + workspace:delete + billing). The plan does not reduce roles. If the user wants to collapse owner→admin, that is a separate refactor; flagged here for confirmation but not in scope.
- **Workspace CRUD with role-based access:** existing. Task 7+8 close the viewer gap.
- **Invite system:** existing. No changes needed; verify in Task 10 smoke.
- **Permission guards on routes and actions:** Tasks 3, 4, 5, 6, 8, 9 are exactly this.
- **Placeholder scan:** every step has concrete code or a concrete `grep` to locate the change site. No "TBD" / "etc." / "handle errors appropriately".
- **Type consistency:** `ActorContext` defined Task 1, used Task 2; `VideoLike { ownerId }` defined Task 1, adapted from `video.createdBy` at every call site (Tasks 3, 4); `useVideoPermissions` returns `{ canDelete, canEdit }` consistently across Tasks 2, 3, 4.

## Open Questions for the User (do not block plan execution)

1. Do you want to collapse the `owner` role into `admin` (the spec said three roles)? If yes, that's a separate plan — would touch DB enum, RLS policies, and the last-owner trigger.
2. Should there be a server-side enforcement audit (Supabase RLS policy review) as a follow-up plan? Currently RLS is the source of truth but a re-read is healthy.
