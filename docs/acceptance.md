# Phase 1 Acceptance Gate

Each item from the Phase 1 acceptance gate, with status and evidence.
Final verification run (2026-10-11): `npm run typecheck` clean · `npm test` 118/118 (14 files) ·
`npx playwright test` 15/15 · `npm run build` OK · `npm audit --omit=dev` 0 vulnerabilities.

Status key: **Met** = implemented and verified by an automated test or recorded inspection.
**Met (with deviation)** = met, but a documented choice differs from the original brief.

## Application

| Requirement | Status | Evidence |
|---|---|---|
| All five screens render | Met | `e2e/mobile.spec.ts` (bottom-tab navigation to all 5), `src/tests/app.smoke.test.tsx`, desktop + mobile screenshots of every route |
| Navigation works | Met | Sidebar + bottom tab bar; `e2e/acquisition-flow.spec.ts` crosses all five screens |
| Market comparison works | Met | Sortable/searchable market table, detail panel, ≤3-market comparison panel; `features/markets/markets.test.tsx` |
| Property filtering works | Met | URL-synced filters + reset + empty state; `features/properties/properties.test.tsx`, E2E bedrooms filter |
| Property comparison works | Met | Compare tray → `/properties/compare?ids=` side-by-side on real records; `properties.test.tsx` |
| Property details are accessible | Met | `/property/:id/:tab` workspace (Overview, Underwriting, Compliance, Evidence, Decision); `propertyIntelligence.test.tsx` |
| Acquisition pipeline interactions work | Met | 12-stage Kanban: drag-and-drop (desktop) + Move-to menu, drawer with notes/tasks/assignment/approvals/outreach; `features/crm/crm.test.tsx`, `crossScreen.test.tsx`, E2E |

## Financial

| Requirement | Status | Evidence |
|---|---|---|
| Four scenarios calculate correctly | Met | `domain/finance/scenario.test.ts`, `financing.test.ts` — fixed-input vectors hand-computed independently in `docs/financial-model.md` §7 |
| Inputs update results | Met | Live assumption editor; `propertyIntelligence.test.tsx` (Base ADR edit changes Base only), E2E |
| Operating cash flow distinct from financing-adjusted cash flow | Met | Separate rows/series everywhere (table, chart, monthly table); separate break-evens |
| Startup costs correctly classified | Met | Non-refundable vs refundable deposit vs reserve vs credit/cash funded; deposit-classification vector (variant 9) |
| Reserves separately modeled | Met | `operatingReserve` = months × fixed obligations, excluded from expenses, included in committed capital; variant 10 |
| Break-even calculations handle edge cases | Met | `always` / `not-achievable` states, bisection on real function incl. seasonality clamping; variants 1–3 |
| Credit repayments represented correctly | Met | Amortization schedule, promo expiry balance, post-promo interest, payoff month; vector G |
| Financial unit tests pass | Met | 29 finance tests green |

## Compliance

| Requirement | Status | Evidence |
|---|---|---|
| Gate states work | Met | PASS / FAIL / NEEDS VERIFICATION / N/A radio groups; reducer + RTL tests |
| Unverified critical items prevent final qualification | Met | `HOLD_UNRESOLVED` at final stages; Qualified move refused; `decision.test.ts`, E2E |
| Failed critical gates block qualification | Met | `BLOCKED`; `negative-paths.spec.ts` (ST-102, finalist insurance FAIL) |
| Investment score never overrides hard gates | Met | `decision.test.ts` (high score + FAIL → BLOCKED); ST-102 scores 76 and is BLOCKED |
| Evidence classifications visible | Met | Evidence tab legend + per-record pills; never auto-VERIFIED (`reducer.test.ts`) |

## Design

| Requirement | Status | Evidence |
|---|---|---|
| Adaptive CosmoTech identity consistent | Met | Shared tokens in `src/styles/index.css`; Lead inspected all screens |
| Desktop layouts polished | Met | Lead inspected 1440×900 screenshots of every route; defects found were fixed and re-inspected |
| Mobile layouts usable | Met | 390×844 screenshots inspected; `e2e/mobile.spec.ts` |
| Financial information legible | Met | Tabular numerals, consistent formatters, explicit "—" with reasons for undefined values |
| Animations restrained | Met | Hover/transition only; global `prefers-reduced-motion` override |
| Accessible interactions | Met | axe-core: no serious/critical violations on 6 routes; keyboard test (skip link, arrow-key tabs) |
| No misleading live-data presentation | Met | DEMO DATA strip + badges, "Modeled (demo)" labels, illustrative map caption, SVG illustrations labeled, no source URLs |

## Engineering

| Requirement | Status | Evidence |
|---|---|---|
| Type checking passes | Met | `npm run typecheck` |
| Tests pass | Met | 118 unit/RTL + 15 E2E |
| Production build succeeds | Met | `npm run build` (static `dist/`, HashRouter, `base: './'`) |
| No exposed secrets | Met | No `.env` files; no keys; grep of `src/` |
| No paid runtime services | Met | No network calls (`fetch` absent); all data in-memory |
| README provides working setup | Met | `README.md` |
| Major limitations documented | Met | README "Known limitations", `docs/implementation-status.md` |

## Documented deviations (not acceptance failures)

- Platform fee modeled as 15.5% host-only (conservative). Under realism bounds, the BASE revenue÷rent coherence
  bound was widened from 3.0× to 4.5×.
- One awaiting-consent property (ST-105, Dayton) does not reach the $1,500/mo profit target within realism bounds;
  the other (ST-106) does.
- About half of the demo candidates are BLOCKED. This is intentional under conservative assumptions.
- Touch devices move cards with the Move-to menu, not drag-and-drop.
- State is in memory and resets on refresh (allowed in Phase 1); persistence is Phase 2.
