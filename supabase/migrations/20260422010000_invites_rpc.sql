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
  select email into _email from auth.users where id = auth.uid();

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
