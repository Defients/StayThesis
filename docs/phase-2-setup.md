# Phase 2 shared pilot — local preparation

The optional Supabase mode is implemented locally. No project, accounts,
database migration, Edge deployment or hosting deployment has been created.
The default app still runs entirely offline with an in-memory demo.

## What the pilot supports

- Password sign-in to accounts provisioned by the project owner. Membership
  maps distinct Auth users to Joe (`partner-a`) and Deffy (`partner-b`). The
  browser cannot change identity or reset the shared workspace.
- Private persisted underwriting, manual gates, checklist, evidence, notes,
  tasks, approvals, pipeline and outreach drafts. Comparison, navigation,
  notices and the session stay local. Sessions are memory-only: refresh means
  signing in again; shared records survive.
- Serialized edits, an explicit saving indicator, polling every 15 seconds,
  manual reload, version conflicts and safe retries using the same request ID.
  Conflicts discard pending edits and ask the user to reload/review; they do
  not silently overwrite the other partner. A lost response remains unconfirmed
  until retried or reconciled by reload.
- The server validates each action, derives its actor from membership and runs
  the existing reducer, finance and gate engine. Browser snapshots and actor
  overrides are rejected. Each partner decides only their own approval slot.
- Financial assumptions, preferences, compliance or evidence changes clear
  prior decisions for the affected property's requests (preferences affect all
  properties). Both partners must approve again. Notes/tasks do not clear them.
- Capture source names, URL text, claim/value, scope, dates, period, notes and
  linked gate. Capture is always UNVERIFIED/UNREVIEWED and never passes a gate.
  URLs are not fetched; no file upload or municipal lookup is implemented.

Shared initialization retains fictional inventory and synthetic metrics, but
clears simulated approvals, notes, tasks and outreach, puts every card at
Discovered, resets checklist completion and leaves every manual gate unresolved.
Synthetic evidence is demoted to UNVERIFIED (engine evidence stays CALCULATED).
This is a collaboration pilot, not a real-property acquisition database.

## Provision a new project

1. Create a new Supabase project in your own organization. This work does not
   assume a plan or incur project costs. Check your selected plan/limits before
   creating it. Do not apply these files to an unrelated existing project.
2. In Auth, disable public sign-ups and anonymous sign-ins. Create two confirmed
   email/password users for the partners through the dashboard; choose strong
   passwords privately. The app does not send invitations or reset emails.
3. Apply the checked-in migration with the dashboard SQL editor, or with the
   pinned CLI after login/linking. Preview the migration before applying:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push --dry-run
   npx supabase db push
   ```

4. Open `supabase/provision-workspace.sql`, replace its two placeholder UUIDs
   with the Auth users' IDs, and run it once in the project's SQL editor. Save
   the returned `workspace_id`. The unique constraints prevent the same account
   from occupying both partner slots. Membership is managed by the owner, not
   by clients. Remove a membership to revoke that account's workspace access.
5. Build and deploy the function:

   ```powershell
   npm run build:server
   npx supabase secrets set STAYTHESIS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
   npx supabase functions deploy workspace --use-api --no-verify-jwt
   ```

   For hosting, replace/add the exact HTTPS app origin (no trailing slash).
   Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the
   function runtime. The privileged key is used there only. The handler calls
   `Auth.getUser(token)` and checks database membership on **every** request;
   disabling the gateway JWT check does not disable application authorization.
   CORS is an additional browser restriction, not the authorization boundary.
6. Copy `.env.example` to `.env.local` and fill the three **public build-time**
   values: project URL, an `sb_publishable_` key and workspace UUID. Never put a
   service-role/secret key in any `VITE_*` variable. Both the build and browser
   validate configuration; incomplete configuration fails closed.
7. Run `npm run dev`, sign in, and verify membership and both approval slots.
   Build the configured SPA with `npm run build` for static hosting. Changing
   project configuration requires restarting Vite/rebuilding. Without these
   values, the app starts the offline demo and makes no API calls.

## Verify before using the cloud pilot

```powershell
npm run typecheck
npm test
npm run test:database
npm run build:server
npm run test:e2e
npm run test:e2e:shared
npm run build
```

The database script executes the actual migration on PostgreSQL via PGlite,
with test Auth users/roles. It checks read isolation, no anonymous access,
client write/RPC denial, membership/actor binding, version conflicts,
request replay, membership revocation and audit protection. It does not replace
testing hosted Supabase Auth, API permissions and Edge deployment.

Shared browser tests use the real Supabase browser SDK and canonical HTTP
handler with mocked Auth responses and a test repository. They exercise two
accounts, notes, both approvals, reload/sign-in persistence, source capture,
workspace isolation and axe scans. They create no real users and make no
external requests. `dist-shared/` is a test build, not a deployable cloud setup.

On the new cloud project, confirm: outsider accounts see no records; direct
table writes and the commit RPC fail for browser roles; each account controls
only its own slot; edited underwriting clears approvals; simultaneous edits
produce a conflict; reconnect/reload shows saved state. Run Supabase security
and performance advisors after applying the migration. These hosted checks
are still outstanding because no project has been provisioned.

## Design decisions and limits

- One versioned mutable JSON document per workspace minimizes schema drift
  with the existing reducer. Static demo inventory stays in code; derived
  finance/results/gates/score/readiness are never persisted. No automatic
  import of a user's demo session occurs.
- `workspace_events` records every committed action with server identity,
  sequence and timestamp. It is append-only through the application/browser
  APIs; the owner/service role remains privileged. Field-coalesced activity is
  a friendly projection; the separate event log retains all actions.
- The internal commit RPC uses SECURITY INVOKER, has no public/client EXECUTE
  grant, and rechecks membership while locking the workspace. Snapshot and
  event insertion commit atomically. Server-only privileges are deliberate;
  RLS is enabled on all exposed tables and client roles receive SELECT only.
- Readiness now requires live satisfied gates and at least one request even in
  the demo (fixes empty-request/vacuous approval and regressed-gate readiness).
  In shared mode it also requires startup-budget and lease-commitment requests,
  plus credit-use when financing uses credit, with both slots approved on
  every request. Readiness does not execute a lease, payment or credit draw.
- The snapshot is capped at 2 MB. Polling reads the whole document. There is
  no normalized real inventory CRUD, realtime subscription, offline edit queue
  across reloads, backup/restore UI, file storage, outreach delivery, MFA or
  password recovery UI. These remain separate work before production use.
- Deploying a new domain/catalog/model version needs a deliberate workspace
  migration plan. Schema version 1 rejects other document versions. Do not
  treat existing pilot records as compatible with arbitrary future seed changes.

## Documentation checked

Implementation follows Supabase's [password sign-in API](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
[server-side getUser API](https://supabase.com/docs/reference/javascript/auth-getuser),
[RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security),
and [Edge deployment guide](https://supabase.com/docs/guides/functions/deploy).
The changelog and installed CLI help were checked during local implementation.
