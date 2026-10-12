# Working in this repo

StayThesis — a local, static, $0-runtime React 19 + TypeScript (strict) app.
Synthetic demo data only; nothing is persisted, sent, or authenticated.

## Commands

```bash
npm install                 # deps
npm run dev                 # dev server :5173
npm run typecheck           # tsc -b
npm test                    # vitest (jsdom, src/ only)
npm run test:e2e            # playwright → builds + previews :4173
npx playwright install chromium   # one-time browser install
npm run build               # tsc -b && vite build → dist/
npm run preview             # serve dist/
npm run screenshots         # needs the dev server running → artifacts/screenshots/
```

## Conventions

- **`src/domain/types.ts` is the contract** — every entity lives there; it
  imports nothing.
- **`docs/domain-rules.md` and `docs/financial-model.md` are authoritative
  specs** — match them, or call out a deviation explicitly.
- **Domain is pure** — `src/domain/` has no React, no I/O, no imports upward.
  Direction: `domain` ← `data/demo` ← `app/store` ← `features`/`components`.
- **Derived is never stored** — scenario results, calculated gates, decision,
  score, screening, ready-to-acquire, live evidence values are recomputed in
  `selectors.ts`/`evaluate.ts`. Store only user-mutable fields.
- **Mutations go through the reducer** — add an `Action`, handle it in
  `reducer.ts`, log meaningful activity (partner names, readable messages).
  UX-level refusals set `state.notice`, never throw.
- **Unknown ≠ approved** — missing manual gates are `NEEDS_VERIFICATION`;
  evidence is never auto-verified; keep compliance uncertainty explicit.
- **Money**: `formatCurrency` from `src/lib/format.ts` (negatives → −$500).
  Percent fields edit as % but store fractions. Rates are fractions.
- **Time**: use `lib/clock.ts` (`now()`, `nowIso()`), not `new Date()` — it's
  stubbable in tests.
- **Accessibility** — axe scans run in E2E; fix the app, not the test. No
  nested interactives, labeled controls, AA contrast.
- **No secrets, no network** — no `fetch`, no external URLs, no env files at
  runtime.
- **Vitest globals are off** — import `describe/it/expect` from `vitest`;
  RTL cleanup is registered in `src/tests/setup.ts`.
- E2E specs live in `e2e/` (excluded from vitest); use `e2e/fixtures.ts`,
  which fails tests on console/page errors.
