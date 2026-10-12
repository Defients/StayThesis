# StayThesis

A local, static, $0-runtime React command center for a two-partner
short-term-rental legal-arbitrage acquisition team: research markets, evaluate
candidate properties, underwrite four scenarios, track legal/compliance
evidence, coordinate partner approvals, and manage an acquisition CRM —
all against a fully synthetic demo dataset.

**Thesis:** _Find the property. Prove the thesis._

## ⚠ DEMO DATA

Every seeded market metric, property, tenant, gate status, evidence record, and
dollar figure in this app is **synthetic demo data** — modeled to be
plausible, not researched. Nothing is verified against real municipalities,
landlords, HOAs, or insurers. Compliance unknowns are shown as unresolved,
never as approvals. The two "partners" (Joe, Deffy) are
simulated personas in the offline demo. Optional shared mode binds these
partner slots to two real accounts. Manually captured sources start unverified.

## Phase 1 scope

The default SPA retains in-memory state, no persistence, no network calls and
no real outreach. An optional **Phase 2 shared pilot** adds Supabase sign-in,
private persisted edits, partner-bound approvals, conflict handling and source
capture. It is prepared locally and has not been deployed. Inventory and market
figures remain synthetic in both modes. See [Phase 2 setup](docs/phase-2-setup.md).

## Requirements

- Node.js ≥ 20 (developed on v24)
- npm

## Commands

```bash
npm install                    # install dependencies
npm run dev                    # dev server → http://localhost:5173
npm run typecheck              # tsc -b (strict)
npm test                       # vitest unit/RTL suite
npx playwright install chromium   # one-time browser install for E2E
npm run test:e2e               # playwright (builds + previews dist on :4173)
npm run build                  # production build → dist/
npm run build:server           # bundle the optional Supabase Edge function
npm run test:database          # local PostgreSQL permissions/concurrency checks
npm run test:e2e:shared        # two-account browser tests with a mocked backend
npm run preview                # serve dist/
npm run screenshots            # desktop+mobile PNGs → artifacts/screenshots/
                               # (requires the dev server running on :5173)
```

## Static hosting

The build uses `HashRouter` and `base: './'` — upload the contents of `dist/`
to any static file host (no server-side routing rules needed). No deployment
has been performed. The offline build has no runtime environment variables or
secrets. Shared mode uses three public build-time settings from `.env.local`;
server credentials remain in the Edge runtime. Configuration is optional and
validated before producing a bundle.

## Project structure

```
src/
  domain/           pure logic — types, finance engine, compliance gates,
                    decision/scoring, screening (no React, no I/O)
  data/demo/        synthetic seed dataset (7 markets, 14 properties, partners,
                    gates, evidence, tasks, approvals)
  app/store/        context + reducer (single mutation point), selectors
                    (all derivation lives here — derived is never stored)
  app/              App routes (HashRouter), providers
  features/         five screens: command-center, markets, properties,
                    property-intelligence, crm (+ compare)
  components/       ui primitives, layout shell, charts, pills
  lib/              format, clock, params
  styles/           Tailwind v4 CosmoTech design tokens
e2e/                Playwright specs (excluded from vitest)
scripts/            screenshots.mjs
docs/               domain rules, financial model, architecture, data model,
                    roadmap, acceptance, implementation status
```

## The five screens

- **Command Center `/`** — time-aware greeting, six KPIs, pipeline funnel,
  top-3 acquisition priorities with derived next steps, per-property risk
  alerts, partner task columns, recent activity, illustrative capital
  exposure, market snapshot.
- **Market Intelligence `/markets`** — seven synthetic markets with modeled
  metrics, seasonality, demand drivers, scatter/risk views; market detail at
  `/markets?market=<id>` links into filtered Explorer results.
- **Property Explorer `/properties`** — filterable/searchable card grid of
  all 14 candidates with decision pills, key financials, save/compare
  toggles; side-by-side compare at `/properties/compare`.
- **Property Intelligence `/property/:id/:tab?`** — per-property workspace:
  Overview, Underwriting (4-scenario editor, monthly projections, startup
  capital, financing), Compliance (10 gates + checklist), Evidence
  (classification, audit trail, live calculated values), Decision (score,
  gates, approvals, ready-to-acquire).
- **Acquisition CRM `/crm`** — 12-stage kanban with drag-and-drop and
  accessible Move-to selects, per-property drawer (notes, tasks, approvals,
  outreach drafts), approvals panel; `?property=<id>` opens the drawer.

## Verification (final runs)

- `npm run typecheck` — clean
- `npm test` — **145/145 tests** across **18 files**
- `npm run test:e2e` — **15/15** Playwright (chromium): acquisition flow,
  negative paths, mobile, axe accessibility scans, keyboard navigation
- `npm run test:e2e:shared` — **3/3**: two-account sync, approvals, source
  capture, memory-only sessions, mobile and shared-mode axe scans (mock backend)
- `npm run test:database` — **27 checks** against PostgreSQL via PGlite
- `npm run build` and `npm run build:server` — pass; optional auth is lazy-loaded
- `npm audit --omit=dev` — **0 vulnerabilities**
- `npm run screenshots` — 26 PNGs in `artifacts/screenshots/`

## Known limitations

- Offline demo resets on reload. Shared records persist on the optional
  backend; sessions are memory-only and require sign-in again after reload.
- Outreach drafts are preview-only; **no messages are sent in Phase 1**.
- Offline identity is simulated. Shared approvals are account-bound; no lease,
  payment or credit transaction is executed in either mode.
- Market metrics are modeled values, not real research.
- Accepted spec deviations (documented in `docs/implementation-status.md`):
  revenue÷rent bound widened to 4.5, ST-105 below the $1,500/mo target,
  BLOCKED-heavy decision mix, seed credit cap.

## Docs

- `docs/domain-rules.md` — authoritative domain spec (stages, gates, decisions)
- `docs/financial-model.md` — authoritative financial spec
- `docs/architecture.md` — stack, module boundaries, data flow, Phase 2 seams
- `docs/data-model.md` — entities + demo dataset + realism bounds
- `docs/roadmap.md` — implemented Phase 2 pilot and remaining Phase 2/3 work
- `docs/phase-2-setup.md` — optional shared backend setup and validation
- `docs/acceptance.md` — Phase 1 acceptance gate with evidence
- `docs/implementation-status.md` — slice history, results, deviations
- `AGENTS.md` — contributor/agent conventions and commands
