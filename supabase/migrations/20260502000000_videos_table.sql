-- ============================================================
-- Videos: server-side metadata so share URLs work cross-user
-- ============================================================

create table if not exists public.videos (
  id text primary key,                          -- matches current local IDs (Date.now().toString())
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  title text not null default 'Untitled recording',
  duration numeric not null default 0,
  thumbnail text default '',
  public_url text,                              -- Supabase Storage URL (set when uploaded)
  storage_path text,                            -- e.g. <uid>/<videoId>.webm — for re-resolving
  visibility text not null default 'link' check (visibility in ('link','workspace','private')),
  views integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists videos_owner_idx on public.videos(owner_id);
create index if not exists videos_workspace_idx on public.videos(workspace_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.videos enable row level security;

-- SELECT: anyone with the link can read videos with visibility='link';
-- workspace members can read 'workspace' videos; only owner reads 'private'.
create policy "videos_select_link"
  on public.videos for select
  using (visibility = 'link');

create policy "videos_select_workspace"
  on public.videos for select
  using (
    visibility = 'workspace'
    and workspace_id is not null
    and public.is_member_of(workspace_id)
  );

create policy "videos_select_owner"
  on public.videos for select
  using (owner_id = auth.uid());

-- INSERT: any authenticated user can insert their own video
create policy "videos_insert_own"
  on public.videos for insert
  with check (owner_id = auth.uid());

-- UPDATE: only owner can update
create policy "videos_update_own"
  on public.videos for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- DELETE: only owner can delete
create policy "videos_delete_own"
  on public.videos for delete
  using (owner_id = auth.uid());

-- ============================================================
-- RPC: increment_video_views — bypasses owner-write restriction
-- so anonymous viewers can bump the counter
-- ============================================================
create or replace function public.increment_video_views(_video_id text)
returns void
language sql security definer
as $$
  update public.videos set views = views + 1 where id = _video_id;
$$;

grant execute on function public.increment_video_views(text) to anon, authenticated;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.touch_videos_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_videos_touch on public.videos;
create trigger trg_videos_touch
  before update on public.videos
  for each row execute function public.touch_videos_updated_at();
