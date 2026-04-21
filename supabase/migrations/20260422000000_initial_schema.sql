-- ============================================================
-- Loom-like Tool: Initial Schema
-- Tables: profiles, workspaces, memberships, invites
-- Auth: Supabase Auth (auth.users)
-- ============================================================

-- ---------- profiles ----------
-- Mirrors auth.users with app-specific fields
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar text default '',
  is_super_admin boolean default false,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

-- ---------- workspaces ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  color text default '#625DF5',
  created_by uuid references public.profiles(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- memberships ----------
create table if not exists public.memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  status text not null default 'active' check (status in ('active','pending','deactivated')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz default now(),
  primary key (user_id, workspace_id)
);

-- ---------- invites ----------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('admin','member','viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists invites_email_idx on public.invites(lower(email));
create index if not exists memberships_ws_idx on public.memberships(workspace_id);

-- ============================================================
-- Helper functions (SECURITY DEFINER to bypass RLS internally)
-- ============================================================

create or replace function public.is_member_of(_workspace_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and workspace_id = _workspace_id
      and status = 'active'
  );
$$;

create or replace function public.role_in(_workspace_id uuid)
returns text
language sql security definer stable
as $$
  select role from public.memberships
  where user_id = auth.uid()
    and workspace_id = _workspace_id
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select is_super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_member_of(uuid) to authenticated, anon;
grant execute on function public.role_in(uuid) to authenticated, anon;
grant execute on function public.is_super_admin() to authenticated, anon;

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, name, email, created_at, last_login_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.workspaces   enable row level security;
alter table public.memberships  enable row level security;
alter table public.invites      enable row level security;

-- profiles: user can see/update self; super_admin can see all;
-- workspace peers can see each other's profiles (name/email)
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m1.status = 'active'
        and m2.user_id = profiles.id and m2.status = 'active'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid() or public.is_super_admin());

-- workspaces: members read; owners/admins update; owners delete;
-- super_admin has full access; any authenticated user can create
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces
  for select using (public.is_member_of(id) or public.is_super_admin());

drop policy if exists ws_insert on public.workspaces;
create policy ws_insert on public.workspaces
  for insert with check (auth.uid() is not null);

drop policy if exists ws_update on public.workspaces;
create policy ws_update on public.workspaces
  for update using (
    public.role_in(id) in ('owner','admin') or public.is_super_admin()
  );

drop policy if exists ws_delete on public.workspaces;
create policy ws_delete on public.workspaces
  for delete using (
    public.role_in(id) = 'owner' or public.is_super_admin()
  );

-- memberships: members can read peers; only creator adds self;
-- owners/admins manage; super_admin full
drop policy if exists mem_select on public.memberships;
create policy mem_select on public.memberships
  for select using (public.is_member_of(workspace_id) or public.is_super_admin());

drop policy if exists mem_insert on public.memberships;
create policy mem_insert on public.memberships
  for insert with check (
    -- creator adding themselves as owner of newly created ws
    user_id = auth.uid()
    or public.role_in(workspace_id) in ('owner','admin')
    or public.is_super_admin()
  );

drop policy if exists mem_update on public.memberships;
create policy mem_update on public.memberships
  for update using (
    public.role_in(workspace_id) in ('owner','admin') or public.is_super_admin()
  );

drop policy if exists mem_delete on public.memberships;
create policy mem_delete on public.memberships
  for delete using (
    public.role_in(workspace_id) in ('owner','admin') or public.is_super_admin()
  );

-- invites
drop policy if exists inv_select on public.invites;
create policy inv_select on public.invites
  for select using (
    public.is_member_of(workspace_id)
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_super_admin()
  );

drop policy if exists inv_insert on public.invites;
create policy inv_insert on public.invites
  for insert with check (
    public.role_in(workspace_id) in ('owner','admin') or public.is_super_admin()
  );

drop policy if exists inv_delete on public.invites;
create policy inv_delete on public.invites
  for delete using (
    public.role_in(workspace_id) in ('owner','admin') or public.is_super_admin()
  );
