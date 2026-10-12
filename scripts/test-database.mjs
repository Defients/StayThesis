import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Actual PostgreSQL engine; only Supabase Auth's identities/roles are stubbed.
// No Docker, cloud account, secrets, or network are needed.
const db = new PGlite();
const workspace = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const joe = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const deffy = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const outsider = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
let checks = 0;
const check = (value, expected) => { assert.deepEqual(value, expected); checks++; };

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${joe}'), ('${deffy}'), ('${outsider}');
  `);
  const files = (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await db.query('insert into public.workspaces(id,name) values ($1,$2),($3,$4)', [workspace, 'StayThesis', other, 'Other']);
  await db.query('insert into public.workspace_members values ($1,$2,$3),($1,$4,$5),($6,$7,$3)',
    [workspace, joe, 'partner-a', deffy, 'partner-b', other, outsider]);
  await assert.rejects(db.query('insert into public.workspace_members values ($1,$2,$3)', [workspace, joe, 'partner-b'])); checks++;
  await assert.rejects(db.query('insert into public.workspace_members values ($1,$2,$3)', [workspace, outsider, 'partner-a'])); checks++;

  async function as(role, user, run) {
    await db.exec(`set role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    try { return await run(); } finally { await db.exec('reset role'); }
  }
  const commit = (user, partner, version, request, action = { type: 'ADD_NOTE' }, state = { pipeline: {} }) =>
    db.query('select public.commit_workspace_action($1,$2,$3,$4,$5,$6,$7,$8) result',
      [workspace, user, partner, version, request, action, state, null]);
  const request = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const request2 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  await as('anon', '', async () => {
    await assert.rejects(db.query('select * from public.workspaces')); checks++;
    await assert.rejects(commit(joe, 'partner-a', 0, request)); checks++;
  });
  await as('authenticated', joe, async () => {
    check((await db.query('select id from public.workspaces')).rows, [{ id: workspace }]);
    check((await db.query('select user_id from public.workspace_members')).rows, [{ user_id: joe }]);
    await assert.rejects(db.query('update public.workspaces set state = $1 where id = $2', [{ forged: true }, workspace])); checks++;
    await assert.rejects(db.query('insert into public.workspace_members values ($1,$2,$3)', [other, joe, 'partner-b'])); checks++;
    await assert.rejects(commit(joe, 'partner-a', 0, request)); checks++;
  });
  await as('service_role', '', async () => {
    await assert.rejects(commit(outsider, 'partner-a', 0, request)); checks++;
    await assert.rejects(commit(joe, 'partner-b', 0, request)); checks++;
    await assert.rejects(commit(joe, 'partner-a', 0, request)); checks++;
    const initial = await commit(joe, 'partner-a', 0, request, { type: 'INITIALIZE' });
    check(initial.rows[0].result.version, 1);
    check(initial.rows[0].result.replayed, false);
    const repeat = await commit(joe, 'partner-a', 0, request, { type: 'INITIALIZE' });
    check(repeat.rows[0].result.version, 1);
    check(repeat.rows[0].result.replayed, true);
    await assert.rejects(commit(deffy, 'partner-b', 0, request, { type: 'INITIALIZE' })); checks++;
    await assert.rejects(commit(joe, 'partner-a', 1, request, { type: 'ADD_NOTE' })); checks++;
    await assert.rejects(commit(joe, 'partner-a', 0, request2)); checks++;
    check((await commit(deffy, 'partner-b', 1, request2)).rows[0].result.version, 2);
    check((await db.query('select count(*)::int n from public.workspace_events')).rows[0].n, 2);
  });
  await as('authenticated', outsider, async () => {
    check((await db.query('select * from public.workspace_events')).rows, []);
    check((await db.query('select id from public.workspaces')).rows, [{ id: other }]);
  });
  await as('authenticated', deffy, async () => {
    check((await db.query('select version from public.workspace_events order by version')).rows, [{ version: 1 }, { version: 2 }]);
    await assert.rejects(db.query('delete from public.workspace_events')); checks++;
    await assert.rejects(db.query('update public.workspace_events set action = $1', [{ forged: true }])); checks++;
  });
  await db.query('delete from public.workspace_members where workspace_id=$1 and user_id=$2', [workspace, joe]);
  await as('service_role', '', async () => { await assert.rejects(commit(joe, 'partner-a', 2, crypto.randomUUID())); checks++; });
  console.log(`Database verification: ${checks} checks passed (RLS, permissions, identity, versions, idempotency, membership revocation, audit protection)`);
} finally { await db.close(); }
