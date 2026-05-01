# Super Admin Workspace & Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Super Admin Console so a super admin can create workspaces on behalf of anyone, add existing users to any workspace at any role, change/remove members, and invite new users by email — ensuring every workspace has at least one owner/admin.

**Architecture:** Builds on the existing RBAC primitives (`profilesRepo`, `workspacesRepo`, `membershipsRepo`, `invitesRepo`) and the `is_super_admin` RLS bypass policies already deployed in Supabase. Adds a workspace-detail drill-in view inside `SuperAdminPanel`, a "Create workspace" modal, an "Add member" modal (with "existing user" vs "invite by email" modes), and inline role controls. No new permission schema; super admin bypass is already wired in `RoleGuard` and in Postgres RLS.

**Tech Stack:** React 18, TypeScript, Tailwind, Vite, Supabase (Postgres + RLS), Vitest + React Testing Library.

**Constraint note — user creation:** We cannot create `auth.users` rows from the browser (requires service-role key). "Add a new user with a role" is therefore implemented as an **email invite**: the super admin picks a workspace + role + email; when the invitee signs up (or if they already exist) and accepts via the invite link, they become a workspace member at that role. This is the existing `invitesRepo.create` + `accept_invite` RPC flow. A true "create user with password" flow would require a Supabase Edge Function and is out of scope for this plan.

---

## File Structure

**New files**
- `src/components/admin/CreateWorkspaceModal.tsx` — modal: name/description/color + optional initial-owner picker (defaults to the super admin). Calls `workspacesRepo.createAs`.
- `src/components/admin/WorkspaceDetailPanel.tsx` — drill-in view for one workspace: header, members table (role dropdown + remove), pending invites list (revoke), "Add member" button.
- `src/components/admin/AddMemberModal.tsx` — two-mode modal: (a) pick an existing user from `users` + role; (b) invite new by email + role. Calls `membershipsRepo.insert` or `invitesRepo.create`.
- `src/components/admin/__tests__/CreateWorkspaceModal.test.tsx`
- `src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx`
- `src/components/admin/__tests__/AddMemberModal.test.tsx`
- `src/lib/repos/__tests__/workspaces.createAs.test.ts`

**Modified files**
- `src/lib/repos/workspaces.ts` — add `createAs(ownerId, input)` that creates a workspace attributed to a chosen owner, plus the owner membership row in one logical operation.
- `src/components/SuperAdminPanel.tsx` — add "Create workspace" button on the Workspaces tab; clicking a workspace row opens `WorkspaceDetailPanel`.
- `src/lib/repos/memberships.ts` — (no schema change) existing methods already cover insert/setRole/remove; just ensure super admin bypass works (already does via RLS).

**Unchanged (relied on)**
- `src/lib/auth-types.ts` — `Role` type (`'owner' | 'admin' | 'member' | 'viewer'`).
- `src/contexts/AuthContext.tsx` — `state.currentUser.isSuperAdmin`.
- `supabase/migrations/*` — RLS already allows `is_super_admin` profiles to bypass on workspaces, memberships, invites.

---

### Task 1: Add `workspacesRepo.createAs` for owner-attributed workspace creation

**Files:**
- Modify: `src/lib/repos/workspaces.ts`
- Test: `src/lib/repos/__tests__/workspaces.createAs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/repos/__tests__/workspaces.createAs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertWs = vi.fn();
const insertMem = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === 'workspaces') {
    return { insert: (row: any) => ({ select: () => ({ single: async () => insertWs(row) }) }) };
  }
  if (table === 'memberships') {
    return { insert: async (row: any) => insertMem(row) };
  }
  throw new Error('unexpected table ' + table);
});

vi.mock('../../supabase', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { workspacesRepo } from '../workspaces';

beforeEach(() => {
  insertWs.mockReset();
  insertMem.mockReset();
});

describe('workspacesRepo.createAs', () => {
  it('inserts workspace attributed to ownerId and creates owner membership', async () => {
    insertWs.mockResolvedValue({ data: { id: 'ws1', name: 'Marketing', created_by: 'user1' }, error: null });
    insertMem.mockResolvedValue({ error: null });

    const res = await workspacesRepo.createAs('user1', { name: 'Marketing', description: 'Team', color: '#ff0000' });

    expect(insertWs).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Marketing',
      description: 'Team',
      color: '#ff0000',
      created_by: 'user1',
      settings: {},
    }));
    expect(insertMem).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user1',
      workspace_id: 'ws1',
      role: 'owner',
      status: 'active',
    }));
    expect(res.data?.id).toBe('ws1');
    expect(res.error).toBeNull();
  });

  it('returns workspace insert error without calling membership insert', async () => {
    insertWs.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const res = await workspacesRepo.createAs('user1', { name: 'X' });
    expect(insertMem).not.toHaveBeenCalled();
    expect(res.error).toEqual({ message: 'denied' });
  });

  it('returns membership error if membership insert fails', async () => {
    insertWs.mockResolvedValue({ data: { id: 'ws2', name: 'X', created_by: 'user2' }, error: null });
    insertMem.mockResolvedValue({ error: { message: 'mem failed' } });
    const res = await workspacesRepo.createAs('user2', { name: 'X' });
    expect(res.error).toEqual({ message: 'mem failed' });
    expect(res.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repos/__tests__/workspaces.createAs.test.ts`
Expected: FAIL — `workspacesRepo.createAs is not a function`

- [ ] **Step 3: Implement `createAs`**

Add this method to the `workspacesRepo` object in `src/lib/repos/workspaces.ts`, after `create`:

```ts
  /**
   * Super-admin helper: create a workspace attributed to an arbitrary owner
   * and seed the matching owner membership in one logical op. Relies on RLS
   * super-admin bypass for the inserts.
   */
  async createAs(
    ownerId: string,
    input: { name: string; description?: string; color?: string },
  ) {
    const wsRes = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        description: input.description ?? '',
        color: input.color ?? '#625DF5',
        created_by: ownerId,
        settings: {},
      })
      .select()
      .single<WorkspaceRow>();

    if (wsRes.error || !wsRes.data) return wsRes;

    const memRes = await supabase.from('memberships').insert({
      user_id: ownerId,
      workspace_id: wsRes.data.id,
      role: 'owner',
      status: 'active',
      invited_by: null,
    });

    if (memRes.error) return { data: null, error: memRes.error };
    return wsRes;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/repos/__tests__/workspaces.createAs.test.ts`
Expected: PASS — 3/3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/workspaces.ts src/lib/repos/__tests__/workspaces.createAs.test.ts
git commit -m "feat(repos): add workspacesRepo.createAs for owner-attributed creation"
```

---

### Task 2: `CreateWorkspaceModal` component

**Files:**
- Create: `src/components/admin/CreateWorkspaceModal.tsx`
- Test: `src/components/admin/__tests__/CreateWorkspaceModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/__tests__/CreateWorkspaceModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/__tests__/CreateWorkspaceModal.test.tsx`
Expected: FAIL — cannot resolve `../CreateWorkspaceModal`.

- [ ] **Step 3: Implement `CreateWorkspaceModal`**

```tsx
// src/components/admin/CreateWorkspaceModal.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProfileRow } from '../../lib/repos/profiles';

const COLORS = ['#625DF5', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

interface Props {
  users: ProfileRow[];
  defaultOwnerId: string;
  onCreate: (
    ownerId: string,
    input: { name: string; description?: string; color?: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  onClose: () => void;
}

export function CreateWorkspaceModal({ users, defaultOwnerId, onCreate, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [ownerId, setOwnerId] = useState(defaultOwnerId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    const res = await onCreate(ownerId, { name: name.trim(), description: description.trim(), color });
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create workspace</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workspace name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-gray-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="owner-select" className="block text-xs font-semibold text-gray-600 mb-1">Owner</label>
            <select
              id="owner-select"
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
              ))}
            </select>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim() || busy}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/__tests__/CreateWorkspaceModal.test.tsx`
Expected: PASS — 3/3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/CreateWorkspaceModal.tsx src/components/admin/__tests__/CreateWorkspaceModal.test.tsx
git commit -m "feat(admin): CreateWorkspaceModal with owner picker"
```

---

### Task 3: `AddMemberModal` (existing-user or invite-by-email)

**Files:**
- Create: `src/components/admin/AddMemberModal.tsx`
- Test: `src/components/admin/__tests__/AddMemberModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/__tests__/AddMemberModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddMemberModal } from '../AddMemberModal';

const users = [
  { id: 'u1', name: 'Alice', email: 'a@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
  { id: 'u2', name: 'Bob',   email: 'b@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
];

describe('AddMemberModal', () => {
  it('adds an existing user with a role', async () => {
    const onAddExisting = vi.fn().mockResolvedValue({ error: null });
    const onInvite = vi.fn();
    const onClose = vi.fn();
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set(['u1'])}
        onAddExisting={onAddExisting}
        onInvite={onInvite}
        onClose={onClose}
      />,
    );
    // Alice is already a member — Bob should be the selectable option
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() => expect(onAddExisting).toHaveBeenCalledWith('u2', 'admin'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('invites by email in invite mode', async () => {
    const onInvite = vi.fn().mockResolvedValue({ error: null });
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set()}
        onAddExisting={vi.fn()}
        onInvite={onInvite}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /invite by email/i }));
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'new@x.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'viewer' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(onInvite).toHaveBeenCalledWith('new@x.com', 'viewer'));
  });

  it('disables add when no selectable users exist', () => {
    render(
      <AddMemberModal
        workspaceId="ws1"
        users={users}
        existingMemberIds={new Set(['u1', 'u2'])}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/all users are already members/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/__tests__/AddMemberModal.test.tsx`
Expected: FAIL — cannot resolve `../AddMemberModal`.

- [ ] **Step 3: Implement `AddMemberModal`**

```tsx
// src/components/admin/AddMemberModal.tsx
import { useMemo, useState } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';
import type { ProfileRow } from '../../lib/repos/profiles';
import type { Role } from '../../lib/auth-types';

type Mode = 'existing' | 'invite';

interface Props {
  workspaceId: string;
  users: ProfileRow[];
  existingMemberIds: Set<string>;
  onAddExisting: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onInvite: (email: string, role: Exclude<Role, 'owner'>) => Promise<{ error: { message: string } | null }>;
  onClose: () => void;
}

export function AddMemberModal({ workspaceId: _ws, users, existingMemberIds, onAddExisting, onInvite, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('existing');
  const [role, setRole] = useState<Role>('member');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addable = useMemo(() => users.filter(u => !existingMemberIds.has(u.id)), [users, existingMemberIds]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    if (mode === 'existing') {
      const target = userId || addable[0]?.id;
      if (!target) { setBusy(false); return; }
      const { error } = await onAddExisting(target, role);
      setBusy(false);
      if (error) { setError(error.message); return; }
    } else {
      const e = email.trim().toLowerCase();
      if (!e || !/.+@.+\..+/.test(e)) { setBusy(false); setError('Enter a valid email.'); return; }
      if (role === 'owner') { setBusy(false); setError('Owner role cannot be invited; assign after accept.'); return; }
      const { error } = await onInvite(e, role as Exclude<Role, 'owner'>);
      setBusy(false);
      if (error) { setError(error.message); return; }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add member</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div role="tablist" className="flex border-b border-gray-100 px-2">
          <button
            role="tab"
            aria-selected={mode === 'existing'}
            onClick={() => setMode('existing')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              mode === 'existing' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Existing user
          </button>
          <button
            role="tab"
            aria-selected={mode === 'invite'}
            onClick={() => setMode('invite')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              mode === 'invite' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Mail className="w-4 h-4" /> Invite by email
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === 'existing' ? (
            addable.length === 0 ? (
              <p className="text-sm text-gray-500">All users are already members of this workspace.</p>
            ) : (
              <div>
                <label htmlFor="user-select" className="block text-xs font-semibold text-gray-600 mb-1">User</label>
                <select
                  id="user-select"
                  value={userId || addable[0].id}
                  onChange={e => setUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {addable.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          )}
          <div>
            <label htmlFor="role-select" className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
            <select
              id="role-select"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || (mode === 'existing' && addable.length === 0)}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {busy ? '…' : mode === 'existing' ? 'Add member' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/__tests__/AddMemberModal.test.tsx`
Expected: PASS — 3/3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AddMemberModal.tsx src/components/admin/__tests__/AddMemberModal.test.tsx
git commit -m "feat(admin): AddMemberModal with existing-user and email-invite modes"
```

---

### Task 4: `WorkspaceDetailPanel` — members table, role controls, invites

**Files:**
- Create: `src/components/admin/WorkspaceDetailPanel.tsx`
- Test: `src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceDetailPanel } from '../WorkspaceDetailPanel';

const ws = { id: 'w1', name: 'Design', description: '', color: '#625DF5', created_by: 'u1', settings: {}, created_at: '2026-01-01T00:00:00Z' };
const users = [
  { id: 'u1', name: 'Alice', email: 'a@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
  { id: 'u2', name: 'Bob',   email: 'b@x.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
];

describe('WorkspaceDetailPanel', () => {
  it('lists members and supports role change and removal', async () => {
    const memberships = [
      { user_id: 'u1', workspace_id: 'w1', role: 'owner',  status: 'active', invited_by: null, joined_at: '', profiles: users[0] },
      { user_id: 'u2', workspace_id: 'w1', role: 'member', status: 'active', invited_by: 'u1', joined_at: '', profiles: users[1] },
    ];
    const loadMembers  = vi.fn().mockResolvedValue({ data: memberships, error: null });
    const loadInvites  = vi.fn().mockResolvedValue({ data: [], error: null });
    const setRole      = vi.fn().mockResolvedValue({ error: null });
    const removeMember = vi.fn().mockResolvedValue({ error: null });

    render(
      <WorkspaceDetailPanel
        workspace={ws}
        users={users}
        onBack={vi.fn()}
        loadMembers={loadMembers}
        loadInvites={loadInvites}
        onSetRole={setRole}
        onRemoveMember={removeMember}
        onRevokeInvite={vi.fn()}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Change Bob to admin
    const bobRow = screen.getByText('Bob').closest('tr')!;
    const select = bobRow.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'admin' } });
    await waitFor(() => expect(setRole).toHaveBeenCalledWith('u2', 'admin'));

    // Remove Bob
    const removeBtn = bobRow.querySelector('button[title="Remove member"]')!;
    // jsdom window.confirm auto-confirms via stub
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(removeBtn);
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('u2'));
    confirmSpy.mockRestore();
  });

  it('blocks removal of the last owner', async () => {
    const memberships = [
      { user_id: 'u1', workspace_id: 'w1', role: 'owner', status: 'active', invited_by: null, joined_at: '', profiles: users[0] },
    ];
    const removeMember = vi.fn();
    render(
      <WorkspaceDetailPanel
        workspace={ws}
        users={users}
        onBack={vi.fn()}
        loadMembers={vi.fn().mockResolvedValue({ data: memberships, error: null })}
        loadInvites={vi.fn().mockResolvedValue({ data: [], error: null })}
        onSetRole={vi.fn()}
        onRemoveMember={removeMember}
        onRevokeInvite={vi.fn()}
        onAddExisting={vi.fn()}
        onInvite={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    const row = screen.getByText('Alice').closest('tr')!;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(row.querySelector('button[title="Remove member"]')!);
    expect(removeMember).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/last owner/i));
    alertSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `WorkspaceDetailPanel`**

```tsx
// src/components/admin/WorkspaceDetailPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, UserPlus, Trash2, Crown, Mail } from 'lucide-react';
import type { WorkspaceRow } from '../../lib/repos/workspaces';
import type { ProfileRow } from '../../lib/repos/profiles';
import type { MembershipRow } from '../../lib/repos/memberships';
import type { InviteRow } from '../../lib/repos/invites';
import type { Role } from '../../lib/auth-types';
import { AddMemberModal } from './AddMemberModal';

type MemberWithProfile = MembershipRow & { profiles?: Pick<ProfileRow, 'id' | 'name' | 'email' | 'avatar'> };

interface Props {
  workspace: WorkspaceRow;
  users: ProfileRow[];
  onBack: () => void;
  loadMembers: (wsId: string) => Promise<{ data: MemberWithProfile[] | null; error: { message: string } | null }>;
  loadInvites: (wsId: string) => Promise<{ data: InviteRow[] | null; error: { message: string } | null }>;
  onSetRole: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onRemoveMember: (userId: string) => Promise<{ error: { message: string } | null }>;
  onRevokeInvite: (inviteId: string) => Promise<{ error: { message: string } | null }>;
  onAddExisting: (userId: string, role: Role) => Promise<{ error: { message: string } | null }>;
  onInvite: (email: string, role: Exclude<Role, 'owner'>) => Promise<{ error: { message: string } | null }>;
}

export function WorkspaceDetailPanel({
  workspace, users, onBack, loadMembers, loadInvites,
  onSetRole, onRemoveMember, onRevokeInvite, onAddExisting, onInvite,
}: Props) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [m, i] = await Promise.all([loadMembers(workspace.id), loadInvites(workspace.id)]);
    setMembers((m.data ?? []) as MemberWithProfile[]);
    setInvites((i.data ?? []).filter(r => r.status === 'pending'));
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [workspace.id]);

  const memberIds = useMemo(() => new Set(members.map(m => m.user_id)), [members]);
  const ownerCount = useMemo(() => members.filter(m => m.role === 'owner').length, [members]);

  const changeRole = async (m: MemberWithProfile, role: Role) => {
    if (m.role === 'owner' && role !== 'owner' && ownerCount <= 1) {
      alert('This is the last owner. Promote another member to owner first.');
      return;
    }
    setBusyId(m.user_id);
    const { error } = await onSetRole(m.user_id, role);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setMembers(prev => prev.map(x => x.user_id === m.user_id ? { ...x, role } : x));
  };

  const remove = async (m: MemberWithProfile) => {
    if (m.role === 'owner' && ownerCount <= 1) {
      alert('Cannot remove the last owner. Promote another member first.');
      return;
    }
    if (!confirm(`Remove ${m.profiles?.name || m.profiles?.email || 'this user'} from "${workspace.name}"?`)) return;
    setBusyId(m.user_id);
    const { error } = await onRemoveMember(m.user_id);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
  };

  const revoke = async (inv: InviteRow) => {
    if (!confirm(`Revoke invite for ${inv.email}?`)) return;
    setBusyId(inv.id);
    const { error } = await onRevokeInvite(inv.id);
    setBusyId(null);
    if (error) { alert('Failed: ' + error.message); return; }
    setInvites(prev => prev.filter(x => x.id !== inv.id));
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to workspaces
      </button>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-black" style={{ backgroundColor: workspace.color }}>
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{workspace.name}</h2>
            {workspace.description && <p className="text-sm text-gray-500">{workspace.description}</p>}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
        >
          <UserPlus className="w-4 h-4" /> Add member
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Members ({members.length})</h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(m => (
                  <tr key={m.user_id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold">
                          {(m.profiles?.name || m.profiles?.email || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{m.profiles?.name || m.profiles?.email || m.user_id}</div>
                          <div className="text-xs text-gray-400">{m.profiles?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        aria-label="Role"
                        value={m.role}
                        disabled={busyId === m.user_id}
                        onChange={e => changeRole(m, e.target.value as Role)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      {m.role === 'owner' && <Crown className="inline-block w-3.5 h-3.5 text-yellow-500 ml-1.5 -mt-0.5" />}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        title="Remove member"
                        onClick={() => remove(m)}
                        disabled={busyId === m.user_id}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invites.length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Pending invites ({invites.length})</h3>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    {invites.map(inv => (
                      <tr key={inv.id}>
                        <td className="px-5 py-3 text-sm text-gray-800 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" /> {inv.email}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">{inv.role}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => revoke(inv)}
                            disabled={busyId === inv.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddMemberModal
          workspaceId={workspace.id}
          users={users}
          existingMemberIds={memberIds}
          onAddExisting={async (uid, role) => {
            const res = await onAddExisting(uid, role);
            if (!res.error) await reload();
            return res;
          }}
          onInvite={async (email, role) => {
            const res = await onInvite(email, role);
            if (!res.error) await reload();
            return res;
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx`
Expected: PASS — 2/2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/WorkspaceDetailPanel.tsx src/components/admin/__tests__/WorkspaceDetailPanel.test.tsx
git commit -m "feat(admin): WorkspaceDetailPanel with role controls and invites"
```

---

### Task 5: Wire `SuperAdminPanel` — "Create workspace" button and drill-in

**Files:**
- Modify: `src/components/SuperAdminPanel.tsx`

- [ ] **Step 1: Add imports and state at the top of the component**

At the top of `src/components/SuperAdminPanel.tsx`, add the imports:

```tsx
import { Plus } from 'lucide-react';
import { CreateWorkspaceModal } from './admin/CreateWorkspaceModal';
import { WorkspaceDetailPanel } from './admin/WorkspaceDetailPanel';
import { membershipsRepo } from '../lib/repos/memberships';
import { invitesRepo } from '../lib/repos/invites';
import type { Role } from '../lib/auth-types';
```

Then inside `SuperAdminPanel`, just below `const [toast, setToast] = useState<string | null>(null);`, add:

```tsx
  const [showCreate, setShowCreate] = useState(false);
  const [detailWs, setDetailWs] = useState<WorkspaceWithMembers | null>(null);
```

- [ ] **Step 2: Add "Create workspace" button above the workspaces table**

Locate the `tab === 'workspaces'` branch that renders `<WorkspacesTable … />`. Replace just that `<WorkspacesTable …/>` expression with:

```tsx
              <>
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" /> Create workspace
                  </button>
                </div>
                <WorkspacesTable
                  workspaces={filteredWorkspaces}
                  users={users}
                  mutatingId={mutatingId}
                  onDelete={handleDeleteWorkspace}
                  onOpen={setDetailWs}
                />
              </>
```

- [ ] **Step 3: Add `onOpen` to `WsProps` and make rows clickable**

Update `interface WsProps` to include `onOpen`:

```tsx
interface WsProps {
  workspaces: WorkspaceWithMembers[];
  users: ProfileRow[];
  mutatingId: string | null;
  onDelete: (ws: WorkspaceRow) => void;
  onOpen: (ws: WorkspaceWithMembers) => void;
}
```

Update the `WorkspacesTable` signature and make the workspace name cell a button:

```tsx
function WorkspacesTable({ workspaces, users, mutatingId, onDelete, onOpen }: WsProps) {
```

Inside the `<tr>` in `WorkspacesTable`, change the first `<td>` to wrap its contents in a button:

```tsx
                <td className="px-5 py-3.5">
                  <button onClick={() => onOpen(ws)} className="flex items-center gap-3 text-left hover:opacity-80">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ws.color || '#625DF5' }}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{ws.name}</div>
                      {ws.description && <div className="text-xs text-gray-400 truncate max-w-xs">{ws.description}</div>}
                    </div>
                  </button>
                </td>
```

- [ ] **Step 4: Render the drill-in and the create modal**

Right before the final `</div></div>` that closes the outer `<div className="flex-1 overflow-y-auto bg-gray-50">`, replace the workspaces branch with a conditional that shows the detail panel when `detailWs` is set. Specifically, wrap the existing tab-switch so that if a workspace is being inspected, we show the detail panel instead of the tables.

Locate:

```tsx
        ) : tab === 'overview' ? (
```

and change the preceding block so the rendered content becomes:

```tsx
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : detailWs ? (
          <WorkspaceDetailPanel
            workspace={detailWs}
            users={users}
            onBack={() => { setDetailWs(null); reload(); }}
            loadMembers={(id) => membershipsRepo.listByWorkspace(id)}
            loadInvites={(id) => invitesRepo.listByWorkspace(id)}
            onSetRole={(uid, role) => membershipsRepo.setRole(uid, detailWs.id, role)}
            onRemoveMember={(uid) => membershipsRepo.remove(uid, detailWs.id)}
            onRevokeInvite={(iid) => invitesRepo.revoke(iid)}
            onAddExisting={(uid, role) => membershipsRepo.insert({
              user_id: uid,
              workspace_id: detailWs.id,
              role,
              invited_by: authState.currentUser?.id ?? null,
            })}
            onInvite={(email, role) => invitesRepo.create({
              workspaceId: detailWs.id,
              email,
              role,
              invitedBy: authState.currentUser!.id,
            })}
          />
        ) : tab === 'overview' ? (
```

Then, at the end of the outer container (just before the closing `</div>` of `<div className="max-w-6xl mx-auto px-6 py-8">`), render the create modal:

```tsx
        {showCreate && (
          <CreateWorkspaceModal
            users={users}
            defaultOwnerId={authState.currentUser!.id}
            onCreate={async (ownerId, input) => {
              const res = await workspacesRepo.createAs(ownerId, input);
              if (!res.error) { flash(`Workspace "${input.name}" created`); await reload(); }
              return res as { data: unknown; error: { message: string } | null };
            }}
            onClose={() => setShowCreate(false)}
          />
        )}
```

- [ ] **Step 5: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — no TS errors; all existing + new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/SuperAdminPanel.tsx
git commit -m "feat(admin): wire create workspace + drill-in member management"
```

---

### Task 6: Smoke-test build + push

**Files:** none (build verification only)

- [ ] **Step 1: Build production bundle**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 2: Push to origin**

```bash
git push origin HEAD
```

Expected: Vercel auto-deploys. Open `https://loom-screen-recorder.vercel.app`, sign in as super admin, verify:
1. Admin Console → Workspaces → "Create workspace" opens modal, pick owner, creates workspace.
2. Click a workspace row → detail panel shows members; change role; remove member (blocked on last owner).
3. "Add member" → existing-user mode adds membership instantly; invite-by-email creates a pending invite.

- [ ] **Step 3: Commit any last fixes**

If any manual test revealed issues, fix and commit:

```bash
git add <files>
git commit -m "fix: <issue>"
git push origin HEAD
```

---

## Self-Review

**Spec coverage (user's request):**
1. ✅ Super admin can create workspaces → Task 1 (`createAs`) + Task 2 (modal) + Task 5 (wiring).
2. ✅ Super admin can add people to any workspace with roles → Task 3 (`AddMemberModal` existing-user mode) + Task 4 (`WorkspaceDetailPanel` opens it).
3. ✅ Super admin can add more users with their roles → Task 3 invite-by-email mode (documented constraint: account creation still requires signup/invite accept).
4. ✅ Every workspace has its own admin → Task 1 seeds the chosen owner on creation; Task 4 enforces "last owner" invariant on role change and removal.

**Placeholder scan:** No TBD / TODO / "handle edge cases" placeholders. Every code step has complete code.

**Type consistency:** `Role`, `ProfileRow`, `WorkspaceRow`, `MembershipRow`, `InviteRow` are imported from their existing modules. `createAs` signature matches usage in Task 5. `onAddExisting` / `onInvite` / `onSetRole` / `onRemoveMember` / `onRevokeInvite` signatures are identical in the modal, panel, and wiring tasks (Task 3, 4, 5).
