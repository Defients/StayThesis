# Implementation status

As of Slice 6 (final). Repo: uncommitted working tree on top of lead commits
`c4d073f` (Slice 0–1) and `449dc24` (Slices 2–5 review).

## Slice history

| Slice | Scope | Status |
| --- | --- | --- |
| 0–1 | Foundation, CosmoTech shell, domain types, finance engine + spec test vectors | Done — committed `c4d073f` |
| 2 | 7 markets, 14 properties, Market Intelligence, Property Explorer, compare, charts, illustrations | Done — committed `449dc24` |
| 3–4 | Dataset realism (15.5% host fee, bounded premiums/occupancy), reducer hardening, Property Intelligence workspace (5 tabs), 106 tests | Done — committed `449dc24` |
| 5 | Defect fixes A1–A10, Acquisition CRM, Command Center, `REQUEST_APPROVAL`, 118 tests | Done — committed `449dc24` |
| 6 | Command Center polish, Playwright+axe E2E, a11y fixes, full docs | Done — this slice, uncommitted |

## Verification (final runs)

- `npm run typecheck` — clean
- `npm test` — 118/118, 14 files
- `npm run test:e2e` — 15/15 (chromium): acquisition flow, 4 negative paths, 3 mobile, 6 axe scans + keyboard test
- `npm run build` — pass; main ≈278 kB (≈86 kB gzip), per-route lazy chunks
- `npm audit --omit=dev` — 0 vulnerabilities
- `npm run screenshots` — 26 PNGs in `artifacts/screenshots/`

## Architectural decisions (see architecture.md for rationale)

In-memory `useReducer` store as the single mutation point; selectors own all
derivation (derived-never-stored); HashRouter for static hosting; hand-rolled
SVG charts/illustrations; host-only 15.5% platform fee model; bespoke CRM
drawer instead of shared centered Dialog; reducer refusals via `state.notice`.

## Accepted deviations from spec

1. **Revenue÷rent bound 4.5** — the requested 3.0 ceiling is infeasible under
   the 15.5% host-fee model; coherence test asserts [1.3, 4.5].
2. **ST-105 Dayton awaiting-consent below $1,500/mo** — Dayton economics cap
   ≈$500/mo within bounds; ST-106 (Columbus) does meet the target.
3. **BLOCKED-heavy decision mix (7/14)** — honest consequence of host-fee
   economics on marginal markets.
4. **Seed credit cap** — `creditFundedAmount = min(2500, floor(eligible/100)*100)`
   so no seed violates credit eligibility.
5. **CRM drawer is bespoke** — right-sheet/full-screen-mobile + nested draft
   dialog doesn't fit the centered `Dialog`.
6. **`--color-muted` lightened** (#71849b → #8296ab) for AA contrast.

## Slice 6 fixes folded into a11y work

- Skip link collided with HashRouter (`href="#main-content"` 404'd the app) —
  now focuses `main` programmatically.
- `nested-interactive`: CRM card was `role="button"` wrapping a select — now a
  `role="group"` card with a real button on the property name; scatter/map
  SVGs changed `role="img"` → `role="group"` so dots stay interactive.
- `aria-required-children`: kanban container no longer poses as a `list`.
- `definition-list`: promo warning `<p>` moved out of the financing `<dl>`.
- `link-in-text-block`: in-text links get persistent underlines.

## Open issues / known limitations

- No persistence (by design — Phase 2 seam at the reducer).
- Outreach drafts are review-only; Send is disabled.
- Partner identity is simulated; no auth.
- Market metrics are modeled demo values, not research.
- Native HTML5 DnD is desktop-only; mobile/touch moves via the Move-to select.
