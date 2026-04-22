-- Super-admin workspace management RPCs and last-owner invariant.
--
-- (a) create_workspace_as: single-transaction workspace + owner-membership
--     insert, callable only by super admins.
-- (b) ensure_workspace_has_owner: constraint trigger that prevents UPDATE or
--     DELETE of a membership from leaving a workspace with zero active owners.

-- (a) RPC ───────────────────────────────────────────────────────────────────

create or replace function public.create_workspace_as(
  _owner_id uuid,
  _name text,
  _description text default '',
  _color text default '#625DF5'
) returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  _caller uuid := auth.uid();
  _is_sa boolean;
  _ws public.workspaces;
begin
  if _caller is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select is_super_admin into _is_sa from public.profiles where id = _caller;
  if coalesce(_is_sa, false) is not true then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  insert into public.workspaces (name, description, color, created_by, settings)
  values (_name, coalesce(_description, ''), coalesce(_color, '#625DF5'), _owner_id, '{}'::jsonb)
  returning * into _ws;

  insert into public.memberships (user_id, workspace_id, role, status, invited_by)
  values (_owner_id, _ws.id, 'owner', 'active', _caller);

  return _ws;
end;
$$;

grant execute on function public.create_workspace_as(uuid, text, text, text) to authenticated;

-- (b) Last-owner trigger ───────────────────────────────────────────────────

create or replace function public.ensure_workspace_has_owner()
returns trigger
language plpgsql
as $$
declare
  _ws_id uuid;
  _owner_count int;
begin
  if tg_op = 'DELETE' then
    _ws_id := old.workspace_id;
  else
    _ws_id := new.workspace_id;
  end if;

  select count(*) into _owner_count
  from public.memberships
  where workspace_id = _ws_id
    and role = 'owner'
    and status = 'active';

  if _owner_count = 0 then
    raise exception 'workspace must have at least one active owner'
      using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists ensure_workspace_has_owner_trg on public.memberships;
create constraint trigger ensure_workspace_has_owner_trg
  after update or delete on public.memberships
  deferrable initially deferred
  for each row execute function public.ensure_workspace_has_owner();
