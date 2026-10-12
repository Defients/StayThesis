-- Client roles can read their workspace; only the authenticated Edge handler
-- can commit canonical reducer results. No browser can supply a state snapshot.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 150),
  schema_version integer not null default 1 check (schema_version = 1),
  version bigint not null default 0 check (version >= 0),
  state jsonb,
  updated_at timestamptz not null default now(),
  constraint bounded_state check (state is null or (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 2000000))
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id text not null check (partner_id in ('partner-a', 'partner-b')),
  primary key (workspace_id, user_id),
  unique (workspace_id, partner_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);

create table public.workspace_events (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version bigint not null,
  request_id uuid not null,
  user_id uuid not null,
  partner_id text not null check (partner_id in ('partner-a', 'partner-b')),
  action jsonb not null,
  notice jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, version),
  unique (workspace_id, request_id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_events enable row level security;
revoke all on public.workspaces, public.workspace_members, public.workspace_events from anon, authenticated;
grant select on public.workspaces, public.workspace_members, public.workspace_events to authenticated;
grant all on public.workspaces, public.workspace_members, public.workspace_events to service_role;

create policy own_membership on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy member_workspace on public.workspaces for select to authenticated
  using (exists (select 1 from public.workspace_members m where m.workspace_id = id and m.user_id = (select auth.uid())));
create policy member_events on public.workspace_events for select to authenticated
  using (exists (select 1 from public.workspace_members m where m.workspace_id = workspace_events.workspace_id and m.user_id = (select auth.uid())));

-- This is a privileged internal API, not SECURITY DEFINER. EXECUTE is granted
-- exclusively to service_role. Row lock + version check + event insertion are
-- one transaction, including a membership recheck at the commit boundary.
create function public.commit_workspace_action(
  p_workspace_id uuid, p_user_id uuid, p_partner_id text,
  p_expected_version bigint, p_request_id uuid, p_action jsonb,
  p_state jsonb, p_notice jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  w public.workspaces%rowtype;
  prior public.workspace_events%rowtype;
begin
  perform 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id and partner_id = p_partner_id for share;
  if not found then raise exception 'Workspace access denied' using errcode = '42501'; end if;
  select * into w from public.workspaces where id = p_workspace_id for update;
  if not found then raise exception 'Workspace access denied' using errcode = '42501'; end if;
  select * into prior from public.workspace_events where workspace_id = p_workspace_id and request_id = p_request_id;
  if found then
    if prior.user_id <> p_user_id or prior.partner_id <> p_partner_id or prior.action <> p_action then
      raise exception 'Request ID already used for another action' using errcode = '22023';
    end if;
    return jsonb_build_object('version', w.version, 'state', w.state, 'notice', prior.notice, 'replayed', true);
  end if;
  if w.version <> p_expected_version then raise exception 'Workspace version conflict' using errcode = '40001'; end if;
  if w.state is not null and p_action ->> 'type' = 'INITIALIZE' then
    raise exception 'Workspace already initialized' using errcode = '22023';
  end if;
  if w.state is null and p_action ->> 'type' <> 'INITIALIZE' then
    raise exception 'Workspace not initialized' using errcode = '22023';
  end if;
  update public.workspaces set state = p_state, version = version + 1, updated_at = now()
    where id = p_workspace_id returning * into w;
  insert into public.workspace_events(workspace_id, version, request_id, user_id, partner_id, action, notice)
    values (p_workspace_id, w.version, p_request_id, p_user_id, p_partner_id, p_action, p_notice);
  return jsonb_build_object('version', w.version, 'state', w.state, 'notice', p_notice, 'replayed', false);
end;
$$;
revoke all on function public.commit_workspace_action(uuid, uuid, text, bigint, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_workspace_action(uuid, uuid, text, bigint, uuid, jsonb, jsonb, jsonb) to service_role;
