# Architecture

## Stack and rationale

| Choice | Why |
| --- | --- |
| React 19 + TypeScript strict | Component model with type-safe domain contracts. |
| Vite | Fast dev/build; `base: './'` keeps the bundle host-agnostic. |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Utility styling driven from CSS custom-property tokens in `src/styles/index.css` (CosmoTech dark-first palette). |
| `react-router` **HashRouter** | Static hosting without server rewrite rules — routes live in the fragment, so any static file server works. |
| `useReducer` + context store | One explicit mutation point for the whole demo workspace; no external state lib needed at this size. |
| Hand-rolled SVG charts | The dataset is tiny and charts are bespoke (bars, line overlay, scatter, horizontal bars, score ring, sparkline). No chart dependency means predictable output, easy a11y (`role`/`title`), and no bundle weight. |
| SVG illustrations instead of photos | Fictional properties must not use real listing photos; palette×variant generated scenes keep cards visually distinct at $0. |
| `lucide-react` | Icon set. |
| Vitest + RTL + Playwright + axe | Unit/RTL in jsdom; E2E against the real production bundle in a real browser. |

No chart library, no UI component library, no state library, no router
beyond `react-router`, no network calls — everything renders from the
in-memory seed.

## Module boundaries

```
domain/        pure functions + types. No React, no I/O, no imports upward.
  types.ts       every entity + engine input/output contract
  finance/       scenario engine, breakeven, financing amortization, calendar
  compliance/    gate definitions (manual vs calculated)
  scoring/       weighted advisory score, evidence confidence, screening checks
  evaluate.ts    property evaluation: results, gates, decision, screening
  preferences.ts planning-preference defaults + screening checks
  crm/           stage order + move rules, outreach draft generator

data/demo/     synthetic seed builders (markets, properties, underwriting,
               gates, evidence, tasks, approvals, outreach, activity).
               Depends only on domain + the finance engine (to keep seed
               financing coherent).

app/store/     DemoState + single Action union + reducer + selectors + context.
  state.ts       state shape, seed hydration (deep-cloned)
  reducer.ts     every mutation; refusals set `state.notice`
  selectors.ts   derived views (PropertyView, portfolio summary) — memoized
                 per state identity via WeakMap
  fieldMeta.ts   field labels/formatters used by editing + activity logging

features/      screens — read via selectors, write via dispatch only.
components/    ui/ primitives, layout chrome, charts, property visuals.
lib/           format.ts, clock.ts (stubbable `now()`), ids.ts, useContainerWidth.
```

The dependency direction never reverses: `domain` knows nothing about the
store or React; features never compute financial results themselves.

## Data flow

```
user input → dispatch(Action) → reducer → new DemoState
     → selectors recompute PropertyView/evaluation for affected properties
     → React re-renders with derived numbers
```

**Derived-never-stored rule.** `ScenarioResult`, gate results for calculated
gates, the decision classification, score, screening checks, ready-to-acquire
and evidence live-values are all recomputed by selectors/evaluation on every
state change. Nothing derived is persisted into state, so the UI can never go
stale and there is no cache-invalidation problem.

**Calculated vs manual gates.** Eight of ten gates are *manual* — user-editable
records in `state.gates`; two are *calculated* — derived from underwriting and
preferences (capital feasibility, conservative-performance — the definitions
live in `domain/compliance/gates.ts`). Manual edits to calculated gates are
refused by the reducer; the UI disables their controls and links to the
underwriting tab.

**Refusal pattern.** The reducer never throws for UX-level refusals — it
returns state unchanged except for `state.notice`, which `NoticeToast`
renders and auto-dismisses.

**Logging.** Every partner-initiated mutation appends an `ActivityEvent`
(newest first). High-frequency field edits coalesce via `logUpdate` (same
actor+kind+property+field prefix replaces the newest entry instead of
flooding).

## Decision log (ADRs)

1. **In-memory store, not localStorage/IndexedDB.** Phase 1 is a demo
   workspace; persistence would hide the "refresh = clean seed" contract.
   The reducer is the single seam where a persistence adapter can attach.
2. **HashRouter.** Static hosting with zero server config; deep links still
   work (`/index.html#/crm?property=x`).
3. **Selectors own derivation.** Keeps components thin and guarantees the
   derived-never-stored invariant; memoization via WeakMap keyed on state
   identity avoids recomputing 14 evaluations per render.
4. **Host-only platform fee (15.5%)** — ADR is the guest-facing nightly
   price; processing applies to direct ancillary only. See
   `docs/implementation-status.md` for why the revenue÷rent bound was widened.
5. **Fictional names, no real addresses/URLs.** `sourceUrl` is typed but
   always null in the demo; outreach copy discloses intended use and is never
   sent.
6. **Bespoke drawer over shared Dialog.** The CRM drawer needs right-sheet /
   full-screen-mobile geometry and a nested draft dialog — a different
   contract than the centered modal `Dialog`.
7. **A11y as acceptance** — axe-core scans are part of CI-equivalent E2E;
   fixes go in the app, not the test (contrast token, nested-interactive
   refactors, dl structure, HashRouter-safe skip link).

## Phase 2 extension seams

These are seams in the existing code — not built functionality:

- **Persistence/sync** — the reducer is the single mutation point: a sync
  adapter can subscribe to `Action`s and reconcile server state; `DemoState`
  is already a serializable plain object.
- **Real evidence sources** — `EvidenceRecord` already carries
  `sourceName`, `sourceUrl`, `retrievedAt`, `effectiveAt`,
  `observationPeriod`, classification and history states; a real fetch
  adapter populates the same shape.
- **Partner identity → auth** — `actingPartnerId` is the only identity hook;
  replacing the switcher with real accounts changes who writes
  `requestedBy`/`reviewer`/audit `actor` without touching domain logic.
- **Approvals → server-enforced** — `DECIDE_APPROVAL` already restricts
  writes to the acting partner's slot; a server would enforce the same rule
  with real identity.
- **Outreach → delivery** — `OutreachDraft.status` is `'DRAFT'` and the UI
  keeps Send disabled; a delivery adapter can flip drafts to sent states.
- **Clock** — `lib/clock.ts` funnels all time access for deterministic
  tests/stubs.
