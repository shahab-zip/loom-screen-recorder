# RBAC & Workspace Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete role-based access control (RBAC) system for the Loom-like recorder: 4 workspace roles (owner/admin/member/viewer) + super-admin, workspace CRUD gated by role, an email-based invite flow, and declarative permission guards on every sensitive route, button, and API call.

**Architecture:** Two-layer authorization. Layer 1 = Supabase Postgres + RLS (the source of truth — already scaffolded in `supabase/migrations/20260422000000_initial_schema.sql`). Layer 2 = client-side guards in React via a `usePermission(permission)` hook and `<RequirePermission>` wrapper that reads the current user's role from `WorkspaceContext`. Invites ride on a `public.invites` table with a token-in-URL accept flow. All role-changing and workspace-mutating actions call Supabase RPCs or typed repo functions; the UI disables (not hides) forbidden controls so the experience is discoverable.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Supabase (Auth + Postgres + RLS), `@supabase/supabase-js`, Vitest + React Testing Library.

---

## Context for the Implementing Engineer

Much of the RBAC primitive layer already exists. **Read these first** before writing code:

- `src/lib/auth-types.ts` — `Role`, `Permission`, `WorkspaceMembership`, `Invite`, `ROLE_HIERARCHY`. Types are final; do not rename.
- `src/lib/permissions.ts` — `hasPermission`, `canManageRole`, `getAssignableRoles`. The role→permission map is authoritative; do not duplicate.
- `src/contexts/AuthContext.tsx` — currently localStorage-based; this plan migrates it to Supabase Auth.
- `src/contexts/WorkspaceContext.tsx` — currently localStorage-based; migrated here to Supabase.
- `supabase/migrations/20260422000000_initial_schema.sql` — tables + RLS already written. This plan **adds** a second migration; it does not rewrite the first.
- `src/components/ManagePage.tsx` — existing member-management screen; most new UI plugs in here.
- `src/App.tsx` — top-level router by `currentView` switch. Route guards go around `renderContent()`.

**Conventions to follow:**
- File naming: `PascalCase.tsx` for components, `kebab-case.ts` for lib modules.
- Async repos live in `src/lib/repos/*.ts` and expose one namespace per table (e.g. `membershipsRepo.list(workspaceId)`).
- Every Supabase mutation returns `{ data, error }`; components surface `error.message` in a red toast.
- Tests live adjacent: `ComponentName.test.tsx` next to `ComponentName.tsx`; lib tests in `src/lib/__tests__/`.
- TDD: write the failing test first in every task. No implementation before a red test.

---

## File Structure

**New files:**

- `src/lib/supabase.ts` — Supabase client singleton.
- `src/lib/repos/workspaces.ts` — workspace CRUD.
- `src/lib/repos/memberships.ts` — membership CRUD, role changes.
- `src/lib/repos/invites.ts` — invite create/accept/revoke/list.
- `src/lib/repos/profiles.ts` — profile read/update, super-admin lookup.
- `src/hooks/usePermission.ts` — returns `boolean` for a single permission in the current workspace.
- `src/hooks/useCurrentRole.ts` — returns `Role | null` for the active workspace.
- `src/components/auth/RequirePermission.tsx` — declarative render guard.
- `src/components/auth/RequireRole.tsx` — declarative render guard (role hierarchy).
- `src/components/auth/RouteGuard.tsx` — wraps a view, redirects if forbidden.
- `src/components/auth/AcceptInvitePage.tsx` — `/invite/:token` landing.
- `src/components/InviteMemberModal.tsx` — invite-by-email UI.
- `src/components/InviteListPanel.tsx` — pending invites table.
- `src/components/RoleBadge.tsx` — uses `ROLE_COLORS` + `ROLE_LABELS`.
- `src/components/SuperAdminPanel.tsx` — global user/workspace listing.
- `supabase/migrations/20260422010000_invites_rpc.sql` — adds `accept_invite(token)` RPC + token column.

**Modified files:**

- `src/contexts/AuthContext.tsx` — swap localStorage for Supabase Auth.
- `src/contexts/WorkspaceContext.tsx` — swap localStorage for Supabase queries; expose `currentRole`, `memberships`.
- `src/components/auth/AuthGuard.tsx` — handles loading state from async auth; routes `/invite/:token` through public path.
- `src/components/ManagePage.tsx` — use new permission hooks to disable forbidden controls; embed `InviteMemberModal` + `InviteListPanel`.
- `src/components/WorkspaceSettingsPage.tsx` — gate delete behind `workspace:delete`.
- `src/components/BillingPage.tsx` — gate behind `workspace:view-billing`.
- `src/components/Sidebar.tsx` — hide/show nav items by permission.
- `src/App.tsx` — wrap each `case` in `<RouteGuard>` with the required permission; add `accept-invite` view.

---

## Task 1: Supabase Client + Env Plumbing

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/__tests__/supabase.test.ts`
- Modify: `.env.example` (create if missing)
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/supabase.test.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '../supabase';

describe('supabase client', () => {
  it('exposes auth and from()', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/__tests__/supabase.test.ts`
Expected: FAIL — cannot resolve `../supabase`.

- [ ] **Step 3: Install dependency**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 4: Add env typings**

Append to `src/vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
```

- [ ] **Step 5: Create client**

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

- [ ] **Step 6: Create `.env.example`**

```
VITE_SUPABASE_URL=https://yqcsnaezegkigdkfadgl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_GlZDOCuPu52CUVV6NpJ68Q_we23Lp1u
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npx vitest run src/lib/__tests__/supabase.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/supabase.ts src/lib/__tests__/supabase.test.ts src/vite-env.d.ts .env.example package.json package-lock.json
git commit -m "feat(rbac): add supabase client singleton with env plumbing"
```

---

## Task 2: Profiles Repo

**Files:**
- Create: `src/lib/repos/profiles.ts`
- Create: `src/lib/repos/__tests__/profiles.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/repos/__tests__/profiles.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profilesRepo } from '../profiles';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

describe('profilesRepo.getCurrent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the profile row for the logged-in user', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', name: 'X', email: 'x@y.com', is_super_admin: false }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any).mockReturnValue({ select });

    const result = await profilesRepo.getCurrent();
    expect(result.data?.id).toBe('u1');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repos/__tests__/profiles.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement repo**

```ts
// src/lib/repos/profiles.ts
import { supabase } from '../supabase';

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  is_super_admin: boolean;
  created_at: string;
  last_login_at: string | null;
}

export const profilesRepo = {
  async getCurrent() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { data: null, error: new Error('not authenticated') };
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userRes.user.id)
      .single<ProfileRow>();
  },

  async update(id: string, patch: Partial<Pick<ProfileRow, 'name' | 'avatar'>>) {
    return supabase.from('profiles').update(patch).eq('id', id).select().single<ProfileRow>();
  },

  async listAll() {
    // super-admin only; RLS enforces
    return supabase.from('profiles').select('*').order('created_at', { ascending: false });
  },
};
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/repos/__tests__/profiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/profiles.ts src/lib/repos/__tests__/profiles.test.ts
git commit -m "feat(rbac): add profiles repo"
```

---

## Task 3: Memberships Repo

**Files:**
- Create: `src/lib/repos/memberships.ts`
- Create: `src/lib/repos/__tests__/memberships.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/repos/__tests__/memberships.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { membershipsRepo } from '../memberships';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({ supabase: { from: vi.fn() } }));

describe('membershipsRepo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists memberships for a workspace', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any).mockReturnValue({ select });
    await membershipsRepo.listByWorkspace('ws1');
    expect(supabase.from).toHaveBeenCalledWith('memberships');
    expect(eq).toHaveBeenCalledWith('workspace_id', 'ws1');
  });

  it('changes role', async () => {
    const eq2 = vi.fn().mockResolvedValue({ data: {}, error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    (supabase.from as any).mockReturnValue({ update });
    await membershipsRepo.setRole('u1', 'ws1', 'admin');
    expect(update).toHaveBeenCalledWith({ role: 'admin' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repos/__tests__/memberships.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement repo**

```ts
// src/lib/repos/memberships.ts
import { supabase } from '../supabase';
import type { Role } from '../auth-types';

export interface MembershipRow {
  user_id: string;
  workspace_id: string;
  role: Role;
  status: 'active' | 'pending' | 'deactivated';
  invited_by: string | null;
  joined_at: string;
}

export const membershipsRepo = {
  async listByWorkspace(workspaceId: string) {
    return supabase
      .from('memberships')
      .select('*, profiles:user_id(id,name,email,avatar)')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });
  },

  async listForUser(userId: string) {
    return supabase
      .from('memberships')
      .select('*, workspaces:workspace_id(*)')
      .eq('user_id', userId)
      .eq('status', 'active');
  },

  async setRole(userId: string, workspaceId: string, role: Role) {
    return supabase
      .from('memberships')
      .update({ role })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
  },

  async remove(userId: string, workspaceId: string) {
    return supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
  },

  async insert(row: Pick<MembershipRow, 'user_id' | 'workspace_id' | 'role' | 'invited_by'>) {
    return supabase.from('memberships').insert({ ...row, status: 'active' });
  },
};
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/repos/__tests__/memberships.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/memberships.ts src/lib/repos/__tests__/memberships.test.ts
git commit -m "feat(rbac): add memberships repo"
```

---

## Task 4: Workspaces Repo

**Files:**
- Create: `src/lib/repos/workspaces.ts`
- Create: `src/lib/repos/__tests__/workspaces.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/repos/__tests__/workspaces.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspacesRepo } from '../workspaces';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({ supabase: { from: vi.fn(), auth: { getUser: vi.fn() } } }));

describe('workspacesRepo.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a workspace then inserts owner membership', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const single = vi.fn().mockResolvedValue({ data: { id: 'ws1', name: 'A', description: '', color: '#625DF5', created_by: 'u1', settings: {}, created_at: '' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insertWs = vi.fn().mockReturnValue({ select });
    const insertMem = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any)
      .mockReturnValueOnce({ insert: insertWs })
      .mockReturnValueOnce({ insert: insertMem });

    const result = await workspacesRepo.create({ name: 'A' });
    expect(result.data?.id).toBe('ws1');
    expect(insertMem).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1', workspace_id: 'ws1', role: 'owner', status: 'active',
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repos/__tests__/workspaces.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement repo**

```ts
// src/lib/repos/workspaces.ts
import { supabase } from '../supabase';

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  color: string;
  created_by: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export const workspacesRepo = {
  async listMine() {
    // RLS returns only workspaces where caller is a member
    return supabase.from('workspaces').select('*').order('created_at', { ascending: true });
  },

  async getById(id: string) {
    return supabase.from('workspaces').select('*').eq('id', id).single<WorkspaceRow>();
  },

  async create(input: { name: string; description?: string; color?: string }) {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return { data: null, error: new Error('not authenticated') };

    const wsRes = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        description: input.description ?? '',
        color: input.color ?? '#625DF5',
        created_by: userRes.user.id,
        settings: {},
      })
      .select()
      .single<WorkspaceRow>();

    if (wsRes.error || !wsRes.data) return wsRes;

    const memRes = await supabase.from('memberships').insert({
      user_id: userRes.user.id,
      workspace_id: wsRes.data.id,
      role: 'owner',
      status: 'active',
      invited_by: null,
    });

    if (memRes.error) return { data: null, error: memRes.error };
    return wsRes;
  },

  async update(id: string, patch: Partial<Pick<WorkspaceRow, 'name' | 'description' | 'color' | 'settings'>>) {
    return supabase.from('workspaces').update(patch).eq('id', id).select().single<WorkspaceRow>();
  },

  async remove(id: string) {
    return supabase.from('workspaces').delete().eq('id', id);
  },
};
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/repos/__tests__/workspaces.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/workspaces.ts src/lib/repos/__tests__/workspaces.test.ts
git commit -m "feat(rbac): add workspaces repo with create-owner transaction"
```

---

## Task 5: Invites DB Migration (token + accept RPC)

**Files:**
- Create: `supabase/migrations/20260422010000_invites_rpc.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add a random token column to invites for URL-based acceptance
alter table public.invites
  add column if not exists token text unique default encode(gen_random_bytes(24), 'hex');

create index if not exists invites_token_idx on public.invites(token);

-- RPC: accept an invite by token. Creates a membership for auth.uid().
create or replace function public.accept_invite(_token text)
returns table(workspace_id uuid, role text)
language plpgsql
security definer
as $$
declare
  _inv public.invites%rowtype;
  _email text;
begin
  select raw_user_meta_data->>'email' into _email from auth.users where id = auth.uid();
  if _email is null then
    select email into _email from auth.users where id = auth.uid();
  end if;

  select * into _inv from public.invites
   where token = _token
     and status = 'pending'
     and expires_at > now()
   limit 1;

  if not found then
    raise exception 'invite_not_found_or_expired';
  end if;

  if lower(_inv.email) <> lower(coalesce(_email, '')) then
    raise exception 'invite_email_mismatch';
  end if;

  insert into public.memberships (user_id, workspace_id, role, status, invited_by)
  values (auth.uid(), _inv.workspace_id, _inv.role, 'active', _inv.invited_by)
  on conflict (user_id, workspace_id) do update set role = excluded.role, status = 'active';

  update public.invites set status = 'accepted' where id = _inv.id;

  workspace_id := _inv.workspace_id;
  role := _inv.role;
  return next;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
```

- [ ] **Step 2: Apply migration**

Run in Supabase SQL editor (paste the file contents) or via CLI:
`supabase db push`
Expected: `CREATE FUNCTION`, `ALTER TABLE` succeed.

- [ ] **Step 3: Verify**

Run in SQL editor:
```sql
select token from public.invites limit 1;
select proname from pg_proc where proname = 'accept_invite';
```
Expected: both return rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422010000_invites_rpc.sql
git commit -m "feat(rbac): add invite token column and accept_invite RPC"
```

---

## Task 6: Invites Repo

**Files:**
- Create: `src/lib/repos/invites.ts`
- Create: `src/lib/repos/__tests__/invites.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/repos/__tests__/invites.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitesRepo } from '../invites';
import { supabase } from '../../supabase';

vi.mock('../../supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

describe('invitesRepo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an invite', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'i1' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    (supabase.from as any).mockReturnValue({ insert });
    await invitesRepo.create({ workspaceId: 'ws1', email: 'a@b.com', role: 'member', invitedBy: 'u1' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'ws1', email: 'a@b.com', role: 'member', invited_by: 'u1',
    }));
  });

  it('accepts an invite via rpc', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: [{ workspace_id: 'ws1', role: 'member' }], error: null });
    const res = await invitesRepo.accept('tok123');
    expect(supabase.rpc).toHaveBeenCalledWith('accept_invite', { _token: 'tok123' });
    expect(res.data?.workspace_id).toBe('ws1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repos/__tests__/invites.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement repo**

```ts
// src/lib/repos/invites.ts
import { supabase } from '../supabase';
import type { Role } from '../auth-types';

export interface InviteRow {
  id: string;
  email: string;
  workspace_id: string;
  role: Role;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  token: string;
}

export const invitesRepo = {
  async listByWorkspace(workspaceId: string) {
    return supabase
      .from('invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
  },

  async create(input: { workspaceId: string; email: string; role: Exclude<Role, 'owner'>; invitedBy: string }) {
    return supabase
      .from('invites')
      .insert({
        workspace_id: input.workspaceId,
        email: input.email.toLowerCase().trim(),
        role: input.role,
        invited_by: input.invitedBy,
      })
      .select()
      .single<InviteRow>();
  },

  async revoke(id: string) {
    return supabase.from('invites').update({ status: 'revoked' }).eq('id', id);
  },

  async accept(token: string) {
    const res = await supabase.rpc('accept_invite', { _token: token });
    if (res.error) return { data: null, error: res.error };
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: row as { workspace_id: string; role: Role } | null, error: null };
  },
};
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/repos/__tests__/invites.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/invites.ts src/lib/repos/__tests__/invites.test.ts
git commit -m "feat(rbac): add invites repo with accept rpc"
```

---

## Task 7: Migrate AuthContext to Supabase Auth

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/contexts/__tests__/AuthContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../lib/supabase', () => {
  const listeners: any[] = [];
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn((cb) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: {} }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
});

vi.mock('../../lib/repos/profiles', () => ({
  profilesRepo: {
    getCurrent: vi.fn().mockResolvedValue({
      data: { id: 'u1', name: 'X', email: 'x@y.com', avatar: '', is_super_admin: false, created_at: '', last_login_at: null },
      error: null,
    }),
  },
}));

function Probe() {
  const { state, signIn } = useAuth();
  return (
    <div>
      <span data-testid="auth">{String(state.isAuthenticated)}</span>
      <button onClick={() => signIn('x@y.com', 'pw')}>go</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('authenticates on signIn', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
    await act(async () => { screen.getByText('go').click(); });
    // we only assert the method was called — Supabase mock doesn't emit state change here
    const { supabase } = await import('../../lib/supabase');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: FAIL — AuthContext still uses localStorage.

- [ ] **Step 3: Rewrite AuthContext**

```tsx
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { profilesRepo, type ProfileRow } from '../lib/repos/profiles';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isSuperAdmin: boolean;
}

interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = { currentUser: null, isAuthenticated: false, isLoading: true };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':   return { ...state, currentUser: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':     return { ...state, currentUser: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':return { ...state, isLoading: action.payload };
    default: return state;
  }
}

function profileToUser(p: ProfileRow): AuthUser {
  return { id: p.id, name: p.name, email: p.email, avatar: p.avatar, isSuperAdmin: p.is_super_admin };
}

interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadProfile = useCallback(async () => {
    const { data, error } = await profilesRepo.getCurrent();
    if (error || !data) { dispatch({ type: 'LOGOUT' }); return; }
    dispatch({ type: 'SET_USER', payload: profileToUser(data) });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile();
      else dispatch({ type: 'SET_LOADING', payload: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') loadProfile();
      if (event === 'SIGNED_OUT') dispatch({ type: 'LOGOUT' });
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  return (
    <AuthContext.Provider value={{ state, signIn, signOut, refresh: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Update LoginPage to use async signIn**

Open `src/components/auth/LoginPage.tsx`, find the submit handler that calls `login(...)`, replace with:

```tsx
const { signIn } = useAuth();
// inside handleSubmit:
setError('');
setSubmitting(true);
const res = await signIn(email, password);
setSubmitting(false);
if (!res.success) setError(res.error ?? 'Sign in failed');
```

- [ ] **Step 6: Update AuthGuard loading gate**

In `src/components/auth/AuthGuard.tsx` before the `isAuthenticated` check, render a full-screen spinner when `state.isLoading`:

```tsx
if (state.isLoading) {
  return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"/></div>;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/__tests__/AuthContext.test.tsx src/components/auth/LoginPage.tsx src/components/auth/AuthGuard.tsx
git commit -m "feat(rbac): migrate AuthContext to supabase auth"
```

---

## Task 8: Migrate WorkspaceContext to Supabase

**Files:**
- Modify: `src/contexts/WorkspaceContext.tsx`
- Create: `src/contexts/__tests__/WorkspaceContext.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/contexts/__tests__/WorkspaceContext.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from '../WorkspaceContext';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false }, isAuthenticated: true, isLoading: false } }),
}));

vi.mock('../../lib/repos/workspaces', () => ({
  workspacesRepo: { listMine: vi.fn().mockResolvedValue({ data: [{ id: 'ws1', name: 'A', color: '#000', description: '', settings: {}, created_by: 'u1', created_at: '' }], error: null }) },
}));

vi.mock('../../lib/repos/memberships', () => ({
  membershipsRepo: { listForUser: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1', workspace_id: 'ws1', role: 'owner', status: 'active' }], error: null }) },
}));

function Probe() {
  const { workspaces, currentRole } = useWorkspace();
  return <div><span data-testid="wc">{workspaces.length}</span><span data-testid="role">{currentRole ?? '-'}</span></div>;
}

describe('WorkspaceContext', () => {
  it('loads workspaces and exposes currentRole', async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(screen.getByTestId('wc').textContent).toBe('1'));
    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('owner'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/contexts/__tests__/WorkspaceContext.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite WorkspaceContext**

```tsx
// src/contexts/WorkspaceContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { workspacesRepo, type WorkspaceRow } from '../lib/repos/workspaces';
import { membershipsRepo, type MembershipRow } from '../lib/repos/memberships';
import type { Role } from '../lib/auth-types';

interface WorkspaceContextValue {
  workspaces: WorkspaceRow[];
  memberships: MembershipRow[];
  currentWorkspaceId: string | null;
  currentWorkspace: WorkspaceRow | null;
  currentRole: Role | null;
  isLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (input: { name: string; description?: string; color?: string }) => Promise<{ success: boolean; error?: string }>;
  updateWorkspace: (id: string, patch: Partial<Pick<WorkspaceRow, 'name'|'description'|'color'|'settings'>>) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace: (id: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { state: authState } = useAuth();
  const userId = authState.currentUser?.id ?? null;

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setWorkspaces([]); setMemberships([]); setCurrentWorkspaceId(null); return; }
    setIsLoading(true); setError(null);
    const [wsRes, memRes] = await Promise.all([
      workspacesRepo.listMine(),
      membershipsRepo.listForUser(userId),
    ]);
    if (wsRes.error) setError(wsRes.error.message);
    if (memRes.error) setError(memRes.error.message);
    const ws = wsRes.data ?? [];
    setWorkspaces(ws);
    setMemberships((memRes.data ?? []) as MembershipRow[]);
    setCurrentWorkspaceId(prev => prev && ws.some(w => w.id === prev) ? prev : (ws[0]?.id ?? null));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const currentWorkspace = useMemo(
    () => workspaces.find(w => w.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId],
  );
  const currentRole = useMemo<Role | null>(
    () => memberships.find(m => m.workspace_id === currentWorkspaceId)?.role ?? null,
    [memberships, currentWorkspaceId],
  );

  const createWorkspace = useCallback(async (input: { name: string; description?: string; color?: string }) => {
    const res = await workspacesRepo.create(input);
    if (res.error) return { success: false, error: res.error.message };
    await refresh();
    if (res.data) setCurrentWorkspaceId(res.data.id);
    return { success: true };
  }, [refresh]);

  const updateWorkspace = useCallback(async (id: string, patch: Partial<Pick<WorkspaceRow,'name'|'description'|'color'|'settings'>>) => {
    const res = await workspacesRepo.update(id, patch);
    if (res.error) return { success: false, error: res.error.message };
    await refresh();
    return { success: true };
  }, [refresh]);

  const deleteWorkspace = useCallback(async (id: string) => {
    const res = await workspacesRepo.remove(id);
    if (res.error) return { success: false, error: res.error.message };
    await refresh();
    return { success: true };
  }, [refresh]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, memberships, currentWorkspaceId, currentWorkspace, currentRole,
      isLoading, error,
      setCurrentWorkspace: setCurrentWorkspaceId,
      createWorkspace, updateWorkspace, deleteWorkspace, refresh,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/contexts/__tests__/WorkspaceContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/WorkspaceContext.tsx src/contexts/__tests__/WorkspaceContext.test.tsx
git commit -m "feat(rbac): migrate WorkspaceContext to supabase"
```

---

## Task 9: Permission Hooks

**Files:**
- Create: `src/hooks/usePermission.ts`
- Create: `src/hooks/useCurrentRole.ts`
- Create: `src/hooks/__tests__/usePermission.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/hooks/__tests__/usePermission.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission } from '../usePermission';

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentRole: 'member' }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ state: { currentUser: { isSuperAdmin: false } } }),
}));

describe('usePermission', () => {
  it('returns true for member:view (member role)', () => {
    const { result } = renderHook(() => usePermission('member:view'));
    expect(result.current).toBe(true);
  });
  it('returns false for workspace:delete (member role)', () => {
    const { result } = renderHook(() => usePermission('workspace:delete'));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/usePermission.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement hooks**

```ts
// src/hooks/useCurrentRole.ts
import { useWorkspace } from '../contexts/WorkspaceContext';
import type { Role } from '../lib/auth-types';

export function useCurrentRole(): Role | null {
  return useWorkspace().currentRole;
}
```

```ts
// src/hooks/usePermission.ts
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../lib/permissions';
import type { Permission } from '../lib/auth-types';

export function usePermission(permission: Permission): boolean {
  const { currentRole } = useWorkspace();
  const { state } = useAuth();
  if (state.currentUser?.isSuperAdmin) return true;
  if (!currentRole) return false;
  return hasPermission(currentRole, permission);
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/hooks/__tests__/usePermission.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePermission.ts src/hooks/useCurrentRole.ts src/hooks/__tests__/usePermission.test.tsx
git commit -m "feat(rbac): add usePermission and useCurrentRole hooks"
```

---

## Task 10: Declarative Guard Components

**Files:**
- Create: `src/components/auth/RequirePermission.tsx`
- Create: `src/components/auth/RequireRole.tsx`
- Create: `src/components/auth/RouteGuard.tsx`
- Create: `src/components/auth/__tests__/RequirePermission.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/auth/__tests__/RequirePermission.test.tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/RequirePermission.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement guards**

```tsx
// src/components/auth/RequirePermission.tsx
import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/auth-types';

export function RequirePermission({
  permission, children, fallback = null,
}: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return usePermission(permission) ? <>{children}</> : <>{fallback}</>;
}
```

```tsx
// src/components/auth/RequireRole.tsx
import type { ReactNode } from 'react';
import { useCurrentRole } from '../../hooks/useCurrentRole';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HIERARCHY, type Role } from '../../lib/auth-types';

export function RequireRole({
  minRole, children, fallback = null,
}: { minRole: Role; children: ReactNode; fallback?: ReactNode }) {
  const role = useCurrentRole();
  const { state } = useAuth();
  if (state.currentUser?.isSuperAdmin) return <>{children}</>;
  if (!role) return <>{fallback}</>;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole] ? <>{children}</> : <>{fallback}</>;
}
```

```tsx
// src/components/auth/RouteGuard.tsx
import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/auth-types';

export function RouteGuard({
  permission, children,
}: { permission: Permission; children: ReactNode }) {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <h2 className="text-xl font-semibold mb-2">You don't have access</h2>
        <p className="text-sm text-gray-600">Ask a workspace admin to grant you the required permission.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/auth/__tests__/RequirePermission.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/RequirePermission.tsx src/components/auth/RequireRole.tsx src/components/auth/RouteGuard.tsx src/components/auth/__tests__/RequirePermission.test.tsx
git commit -m "feat(rbac): add declarative permission guards"
```

---

## Task 11: Apply Route Guards in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Map each view to its permission**

In `renderContent()`, wrap each case. Paste the replacement switch:

```tsx
import { RouteGuard } from './components/auth/RouteGuard';
// ...
switch (currentView) {
  case 'for-you':
    return <RouteGuard permission="video:view"><ForYou videos={filteredVideos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} /></RouteGuard>;
  case 'library':
    return <RouteGuard permission="video:view"><VideoLibrary videos={filteredVideos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} onDeleteVideo={handleDeleteVideo} onRenameVideo={handleRenameVideo} viewType={viewType} onViewTypeChange={setViewType} sortType={sortType} onSortTypeChange={setSortType} /></RouteGuard>;
  case 'meetings':
    return <RouteGuard permission="video:view"><Meetings onNewVideo={openRecordingModal} /></RouteGuard>;
  case 'watch-later':
    return <RouteGuard permission="video:view"><WatchLater videos={videos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} /></RouteGuard>;
  case 'history':
    return <RouteGuard permission="video:view"><History videos={videos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} /></RouteGuard>;
  case 'settings':
    return <Settings onNewVideo={openRecordingModal} />;
  case 'manage':
    return <RouteGuard permission="member:view"><ManagePage /></RouteGuard>;
  case 'workspace-settings':
    return <RouteGuard permission="workspace:view-settings"><WorkspaceSettingsPage /></RouteGuard>;
  case 'billing':
    return <RouteGuard permission="workspace:view-billing"><BillingPage /></RouteGuard>;
  case 'spaces':
    return <RouteGuard permission="space:create"><SpacesPage /></RouteGuard>;
  default:
    return null;
}
```

- [ ] **Step 2: Build to verify no TS errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(rbac): guard top-level routes by permission"
```

---

## Task 12: Gate Sidebar Nav Items

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Wrap nav items**

For each sidebar link, wrap in `<RequirePermission permission="...">`. Example for Manage, Workspace Settings, Billing:

```tsx
import { RequirePermission } from './auth/RequirePermission';
// ...
<RequirePermission permission="member:view">
  <button onClick={() => onViewChange('manage')}>Manage members</button>
</RequirePermission>
<RequirePermission permission="workspace:view-settings">
  <button onClick={() => onViewChange('workspace-settings')}>Workspace settings</button>
</RequirePermission>
<RequirePermission permission="workspace:view-billing">
  <button onClick={() => onViewChange('billing')}>Billing</button>
</RequirePermission>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(rbac): gate sidebar nav items by permission"
```

---

## Task 13: Role Badge Component

**Files:**
- Create: `src/components/RoleBadge.tsx`
- Create: `src/components/__tests__/RoleBadge.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/__tests__/RoleBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';

describe('RoleBadge', () => {
  it('shows role label', () => {
    render(<RoleBadge role="owner" />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RoleBadge.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/RoleBadge.tsx
import { ROLE_COLORS, ROLE_LABELS, type Role } from '../lib/auth-types';

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/__tests__/RoleBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoleBadge.tsx src/components/__tests__/RoleBadge.test.tsx
git commit -m "feat(rbac): add RoleBadge"
```

---

## Task 14: Invite Member Modal

**Files:**
- Create: `src/components/InviteMemberModal.tsx`
- Create: `src/components/__tests__/InviteMemberModal.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/__tests__/InviteMemberModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteMemberModal } from '../InviteMemberModal';

vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: { create: vi.fn().mockResolvedValue({ data: { id: 'i1', token: 'tok' }, error: null }) },
}));
vi.mock('../../hooks/useCurrentRole', () => ({ useCurrentRole: () => 'admin' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ state: { currentUser: { id: 'u1', isSuperAdmin: false } } }) }));

describe('InviteMemberModal', () => {
  it('creates an invite on submit', async () => {
    const onClose = vi.fn();
    render(<InviteMemberModal workspaceId="ws1" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByText(/send invite/i));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const { invitesRepo } = await import('../../lib/repos/invites');
    expect(invitesRepo.create).toHaveBeenCalledWith({ workspaceId: 'ws1', email: 'a@b.com', role: 'member', invitedBy: 'u1' });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/components/__tests__/InviteMemberModal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement modal**

```tsx
// src/components/InviteMemberModal.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentRole } from '../hooks/useCurrentRole';
import { getAssignableRoles } from '../lib/permissions';
import { invitesRepo } from '../lib/repos/invites';
import type { Role } from '../lib/auth-types';

export function InviteMemberModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const { state } = useAuth();
  const role = useCurrentRole();
  const assignable = (role ? getAssignableRoles(role) : (['admin','member','viewer'] as Role[]))
    .filter(r => r !== 'owner') as Exclude<Role,'owner'>[];

  const [email, setEmail] = useState('');
  const [selRole, setSelRole] = useState<Exclude<Role,'owner'>>(assignable[0] ?? 'member');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.currentUser) return;
    setSubmitting(true); setError(null);
    const res = await invitesRepo.create({ workspaceId, email: email.trim(), role: selRole, invitedBy: state.currentUser.id });
    setSubmitting(false);
    if (res.error) { setError(res.error.message); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Invite a teammate</h2>
        <label className="block text-sm font-medium mb-1" htmlFor="invite-email">Email</label>
        <input id="invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
               className="w-full border rounded px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1" htmlFor="invite-role">Role</label>
        <select id="invite-role" value={selRole} onChange={e => setSelRole(e.target.value as Exclude<Role,'owner'>)}
                className="w-full border rounded px-3 py-2 mb-3">
          {assignable.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
          <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded">
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/__tests__/InviteMemberModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/InviteMemberModal.tsx src/components/__tests__/InviteMemberModal.test.tsx
git commit -m "feat(rbac): add InviteMemberModal"
```

---

## Task 15: Invite List Panel

**Files:**
- Create: `src/components/InviteListPanel.tsx`
- Create: `src/components/__tests__/InviteListPanel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/__tests__/InviteListPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InviteListPanel } from '../InviteListPanel';

vi.mock('../../lib/repos/invites', () => ({
  invitesRepo: {
    listByWorkspace: vi.fn().mockResolvedValue({
      data: [{ id: 'i1', email: 'a@b.com', role: 'member', status: 'pending', expires_at: new Date(Date.now()+86400000).toISOString(), token: 't', workspace_id: 'ws1', invited_by: 'u1', created_at: '' }],
      error: null,
    }),
    revoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('InviteListPanel', () => {
  it('renders pending invites', async () => {
    render(<InviteListPanel workspaceId="ws1" />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/components/__tests__/InviteListPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/InviteListPanel.tsx
import { useEffect, useState, useCallback } from 'react';
import { invitesRepo, type InviteRow } from '../lib/repos/invites';
import { RoleBadge } from './RoleBadge';
import { usePermission } from '../hooks/usePermission';

export function InviteListPanel({ workspaceId }: { workspaceId: string }) {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const canRevoke = usePermission('workspace:manage-members');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await invitesRepo.listByWorkspace(workspaceId);
    setRows((res.data ?? []) as InviteRow[]);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  async function revoke(id: string) {
    await invitesRepo.revoke(id);
    load();
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading invites…</div>;
  if (rows.length === 0) return <div className="p-4 text-sm text-gray-500">No invites yet.</div>;

  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left border-b"><th className="py-2">Email</th><th>Role</th><th>Status</th><th>Expires</th><th/></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b">
            <td className="py-2">{r.email}</td>
            <td><RoleBadge role={r.role} /></td>
            <td>{r.status}</td>
            <td>{new Date(r.expires_at).toLocaleDateString()}</td>
            <td className="text-right">
              {canRevoke && r.status === 'pending' && (
                <button onClick={() => revoke(r.id)} className="text-red-600 hover:underline">Revoke</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/__tests__/InviteListPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/InviteListPanel.tsx src/components/__tests__/InviteListPanel.test.tsx
git commit -m "feat(rbac): add InviteListPanel"
```

---

## Task 16: Wire Invite UI into ManagePage + Gate Member Actions

**Files:**
- Modify: `src/components/ManagePage.tsx`

- [ ] **Step 1: Add invite button + modal state**

At the top of the component:

```tsx
import { useState } from 'react';
import { InviteMemberModal } from './InviteMemberModal';
import { InviteListPanel } from './InviteListPanel';
import { RequirePermission } from './auth/RequirePermission';
import { RoleBadge } from './RoleBadge';
import { membershipsRepo } from '../lib/repos/memberships';
import { getAssignableRoles } from '../lib/permissions';
import { useCurrentRole } from '../hooks/useCurrentRole';
import { usePermission } from '../hooks/usePermission';
// ...

const [inviteOpen, setInviteOpen] = useState(false);
const currentRole = useCurrentRole();
const canManage = usePermission('workspace:manage-members');
const canChangeRoles = usePermission('workspace:manage-roles');
const assignable = currentRole ? getAssignableRoles(currentRole) : [];
```

- [ ] **Step 2: Add Invite button in page header**

Inside the header area:

```tsx
<RequirePermission permission="member:invite">
  <button onClick={() => setInviteOpen(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded">
    Invite member
  </button>
</RequirePermission>
```

- [ ] **Step 3: Replace hardcoded Role select with permission-gated select**

Inside the member row, replace the role cell:

```tsx
{canChangeRoles && m.user_id !== currentUserId ? (
  <select value={m.role} onChange={e => membershipsRepo.setRole(m.user_id, workspaceId, e.target.value as any).then(refresh)} className="border rounded px-2 py-1">
    {[m.role, ...assignable.filter(r => r !== m.role)].map(r => <option key={r} value={r}>{r}</option>)}
  </select>
) : (
  <RoleBadge role={m.role} />
)}
```

- [ ] **Step 4: Gate Remove button**

```tsx
{canManage && m.user_id !== currentUserId && m.role !== 'owner' && (
  <button onClick={() => membershipsRepo.remove(m.user_id, workspaceId).then(refresh)} className="text-red-600 hover:underline">
    Remove
  </button>
)}
```

- [ ] **Step 5: Mount modal + invite list**

At bottom of page JSX:

```tsx
<section className="mt-8">
  <h3 className="text-lg font-semibold mb-2">Pending invites</h3>
  <RequirePermission permission="member:view" fallback={<p className="text-sm text-gray-500">You don't have access to view invites.</p>}>
    <InviteListPanel workspaceId={workspaceId} />
  </RequirePermission>
</section>

{inviteOpen && <InviteMemberModal workspaceId={workspaceId} onClose={() => { setInviteOpen(false); /* reload invites */ }} />}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add src/components/ManagePage.tsx
git commit -m "feat(rbac): wire invite flow and gate member actions in ManagePage"
```

---

## Task 17: Accept Invite Page

**Files:**
- Create: `src/components/auth/AcceptInvitePage.tsx`
- Modify: `src/App.tsx` (handle `?invite=<token>` query param)
- Modify: `src/components/auth/AuthGuard.tsx` (pass token through after login)

- [ ] **Step 1: Implement AcceptInvitePage**

```tsx
// src/components/auth/AcceptInvitePage.tsx
import { useEffect, useState } from 'react';
import { invitesRepo } from '../../lib/repos/invites';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export function AcceptInvitePage({ token, onDone }: { token: string; onDone: () => void }) {
  const { state } = useAuth();
  const { refresh, setCurrentWorkspace } = useWorkspace();
  const [status, setStatus] = useState<'idle'|'working'|'ok'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isAuthenticated || status !== 'idle') return;
    setStatus('working');
    invitesRepo.accept(token).then(async res => {
      if (res.error) { setError(res.error.message); setStatus('error'); return; }
      await refresh();
      if (res.data?.workspace_id) setCurrentWorkspace(res.data.workspace_id);
      setStatus('ok');
      setTimeout(onDone, 800);
    });
  }, [state.isAuthenticated, status, token, refresh, setCurrentWorkspace, onDone]);

  if (!state.isAuthenticated) return <div className="p-8 text-center">Sign in to accept this invite.</div>;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        {status === 'working' && <p>Accepting invite…</p>}
        {status === 'ok' && <p className="text-green-600">Joined! Redirecting…</p>}
        {status === 'error' && <p className="text-red-600">Failed: {error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Route to AcceptInvitePage when `?invite=...`**

In `src/App.tsx` top of `AppContent`:

```tsx
import { AcceptInvitePage } from './components/auth/AcceptInvitePage';
// ...
const inviteToken = new URLSearchParams(window.location.search).get('invite');
if (inviteToken) {
  return <AcceptInvitePage token={inviteToken} onDone={() => {
    window.history.replaceState({}, '', window.location.pathname);
    dispatch({ type: 'SET_VIEW', payload: 'for-you' as const });
  }} />;
}
```

- [ ] **Step 3: Verify AuthGuard preserves query string on login**

Read `AuthGuard.tsx` — it should simply render `<LoginPage/>` when unauth, and `children` when auth. Since the URL query string is preserved across login (Supabase redirects back), no code change needed. Add a comment:

```tsx
// After login the ?invite=<token> query string is preserved so AppContent can handle it.
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Manual smoke test**

1. As admin, create an invite; grab token from `invites` table.
2. Open `https://<host>/?invite=<token>` in an incognito window.
3. Sign in as the invited email.
4. See "Joined! Redirecting…" and land in the workspace.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/AcceptInvitePage.tsx src/App.tsx src/components/auth/AuthGuard.tsx
git commit -m "feat(rbac): add accept-invite flow"
```

---

## Task 18: Gate Workspace CRUD

**Files:**
- Modify: `src/components/WorkspaceSettingsPage.tsx`
- Modify: `src/components/BillingPage.tsx`

- [ ] **Step 1: Gate delete workspace button**

In `WorkspaceSettingsPage.tsx`:

```tsx
import { RequirePermission } from './auth/RequirePermission';
// ...
<RequirePermission permission="workspace:delete">
  <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded">
    Delete workspace
  </button>
</RequirePermission>
```

- [ ] **Step 2: Disable edit fields when not allowed**

```tsx
import { usePermission } from '../hooks/usePermission';
const canEdit = usePermission('workspace:edit-settings');
// on each input: disabled={!canEdit}
// on save button: disabled={!canEdit || submitting}
```

- [ ] **Step 3: Gate Billing page content already guarded by RouteGuard**

No extra code; Task 11 handled it.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkspaceSettingsPage.tsx src/components/BillingPage.tsx
git commit -m "feat(rbac): gate workspace settings mutations"
```

---

## Task 19: Super Admin Panel

**Files:**
- Create: `src/components/SuperAdminPanel.tsx`
- Create: `src/components/__tests__/SuperAdminPanel.test.tsx`
- Modify: `src/App.tsx` (add `'super-admin'` to `CurrentView` union + case)
- Modify: `src/lib/types.ts` (extend `CurrentView`)
- Modify: `src/components/Sidebar.tsx` (show link only for super admin)

- [ ] **Step 1: Write failing test**

```tsx
// src/components/__tests__/SuperAdminPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SuperAdminPanel } from '../SuperAdminPanel';

vi.mock('../../lib/repos/profiles', () => ({
  profilesRepo: { listAll: vi.fn().mockResolvedValue({ data: [{ id:'u1', name:'X', email:'x@y.com', is_super_admin:false, avatar:'', created_at:'', last_login_at:null }], error:null }) },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ state: { currentUser: { isSuperAdmin: true } } }) }));

describe('SuperAdminPanel', () => {
  it('renders users when super admin', async () => {
    render(<SuperAdminPanel />);
    await waitFor(() => expect(screen.getByText('x@y.com')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/SuperAdminPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/SuperAdminPanel.tsx
import { useEffect, useState } from 'react';
import { profilesRepo, type ProfileRow } from '../lib/repos/profiles';
import { useAuth } from '../contexts/AuthContext';

export function SuperAdminPanel() {
  const { state } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profilesRepo.listAll().then(res => { setUsers((res.data ?? []) as ProfileRow[]); setLoading(false); });
  }, []);

  if (!state.currentUser?.isSuperAdmin) {
    return <div className="p-8 text-center text-sm text-gray-500">Super admin only.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">All users</h1>
      {loading ? <p>Loading…</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="py-2">Name</th><th>Email</th><th>Super admin</th><th>Created</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.is_super_admin ? 'Yes' : 'No'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Extend CurrentView + App.tsx**

In `src/lib/types.ts` find the `CurrentView` union; add `| 'super-admin'`.

In `src/App.tsx` add case:

```tsx
case 'super-admin':
  return <SuperAdminPanel />;
```

and import `SuperAdminPanel`.

- [ ] **Step 5: Show link in Sidebar for super admin only**

```tsx
import { useAuth } from '../contexts/AuthContext';
const { state } = useAuth();
// ...
{state.currentUser?.isSuperAdmin && (
  <button onClick={() => onViewChange('super-admin')}>Super admin</button>
)}
```

- [ ] **Step 6: Run test, verify pass**

Run: `npx vitest run src/components/__tests__/SuperAdminPanel.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/SuperAdminPanel.tsx src/components/__tests__/SuperAdminPanel.test.tsx src/App.tsx src/lib/types.ts src/components/Sidebar.tsx
git commit -m "feat(rbac): add super admin panel"
```

---

## Task 20: End-to-End Smoke Test + Deploy

**Files:** None (verification only).

- [ ] **Step 1: Local smoke test**

Run: `npm run build && npm run preview`
In three browser profiles:

1. Sign in as `usman@sparkosol.com` (super admin). Confirm: Super Admin link visible; can list all users; can create workspace.
2. From super admin, invite `member@test.com` as member to WS1. Copy invite token from invites table.
3. Sign up `member@test.com` via Supabase dashboard Authentication → Users (admin creates, since public signup is disabled). Visit `?invite=<token>`. Confirm: joins WS1; Sidebar hides Billing & Workspace Settings.

- [ ] **Step 2: Deploy env vars to Vercel**

Add via Vercel dashboard under Project → Settings → Environment Variables:
- `VITE_SUPABASE_URL=https://yqcsnaezegkigdkfadgl.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_GlZDOCuPu52CUVV6NpJ68Q_we23Lp1u`

- [ ] **Step 3: Trigger rebuild**

```bash
git commit --allow-empty -m "chore: redeploy after supabase env wiring"
git push
```

- [ ] **Step 4: Verify production**

Open `https://loom-screen-recorder.vercel.app/`:
- Sign in as super admin → see Super Admin link.
- Open incognito → visit `/` → see Login page with no "Sign up" option.
- Visit invite URL → accept flow works.

- [ ] **Step 5: Final commit**

If any polish changes:

```bash
git add -A
git commit -m "chore(rbac): post-deploy polish"
git push
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|---|---|
| Roles: admin, member, viewer (+ owner) | Tasks 2–4 rely on existing `auth-types.ts` |
| Workspace CRUD with role-based access | Task 4 (repo), Task 18 (UI gating), RLS in migration 1 |
| Invite system | Tasks 5, 6, 14, 15, 17 |
| Permission guards on routes | Tasks 10, 11 |
| Permission guards on actions | Tasks 12, 16, 18 |
| Existing workspace system preserved | Task 8 migrates context, keeps same public shape |
| Video library / settings pages still work | Task 11 wraps them; Task 12 adjusts sidebar |
| Super admin capability | Task 19; RLS `is_super_admin()` in migration 1 |
| No public signup (per phase-1 feedback) | Already done pre-plan; Task 7 keeps signOut/signIn only |

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-rbac-workspace-access-control.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
