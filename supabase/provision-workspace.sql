-- Run once in the NEW project's SQL editor after applying the migration.
-- Replace both placeholders with distinct, existing Auth user UUIDs. This is
-- atomic: a missing user or duplicated identity rolls back the whole statement.
with workspace as (
  insert into public.workspaces(name) values ('Joe and Deffy') returning id
), members as (
  insert into public.workspace_members(workspace_id, user_id, partner_id)
  select id, 'JOE_AUTH_USER_UUID'::uuid, 'partner-a' from workspace
  union all
  select id, 'DEFFY_AUTH_USER_UUID'::uuid, 'partner-b' from workspace
  returning workspace_id
)
select id as workspace_id, (select count(*) from members) as partner_count from workspace;
