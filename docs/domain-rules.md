# StayThesis Domain Rules — Qualification, Scoring, State (Phase 1)

Authoritative spec for `src/domain/{scoring,compliance}`, `src/data/demo`, and the app store.
Types: `src/domain/types.ts`. Finance: `docs/financial-model.md`.

## 1. Planning preferences (editable defaults — advisory, not objective thresholds)

```ts
DEFAULT_PREFERENCES = {
  preferredStartupExposure: 5000, maxStartupExposure: 10000, reserveMonths: 3,
  maxMonthlyRent: 3000, targetMonthlyProfit: 1500, preferredPaybackMonths: 10,
  tempLossTolerancePerMonth: 500, tempLossToleranceMonths: 3,
  targetCashOnCash: 0.25, targetRevenueToRent: 2.0,
  midTermFallbackDays: { min: 30, max: 90 },
}
```

## 2. Hard gates (all 10 categories are critical)

| Category | Label | Mode |
|---|---|---|
| str-regulation | STR regulatory feasibility | manual |
| zoning | Property-specific zoning | manual |
| permit | Permit eligibility | manual |
| hoa | HOA / building restrictions | manual |
| landlord-authorization | Landlord authorization | manual |
| lease-permission | Lease permission (sublet / STR clause) | manual |
| insurance | STR-appropriate insurance | manual |
| capital-feasibility | Capital feasibility | calculated |
| conservative-performance | Conservative-case performance | calculated |
| evidence-quality | Evidence quality | manual |

Calculated gates (cannot be edited by hand; they change when underwriting or preferences change):

- **capital-feasibility**: BASE `capital.startupCashRequirement ≤ preferences.maxStartupExposure` → PASS, else FAIL.
  Note text states both amounts.
- **conservative-performance**: CONSERVATIVE `annual.operatingCashFlow ≥ 0` AND CONSERVATIVE
  `monthlyAverage.afterFinancingCashFlow ≥ −preferences.tempLossTolerancePerMonth` → PASS, else FAIL.

`evaluateGates(records: GateRecord[], results, preferences): GateResult[]` returns all 10 in the table order.
A manual category missing from `records` is `NEEDS_VERIFICATION` (unknown ≠ approved).

## 3. Decision / qualification

`evaluateDecision({ stage, gates, score, results, preferences }): Decision`

1. `stage === 'rejected'` → `REJECTED`.
2. any gate `FAIL` → `BLOCKED`.
3. any gate `NEEDS_VERIFICATION` → `HOLD_UNRESOLVED` if stage ∈ {`final-audit`, `qualified`}, else `RESEARCH_CANDIDATE`
   (at discovery stages an unknown can stay eligible for further research; at final stages it blocks).
4. otherwise → `QUALIFIED`.

`canQualify = !rejected && failed.length === 0 && unresolved.length === 0`. `NOT_APPLICABLE` counts as satisfied.
The score never changes the classification. `risks` lists failed + unresolved gate labels, plus finance flags:
conservative OCF negative, `promo-balance-remaining`, startup above preferred exposure, BASE revenue-to-rent below target.

Stage rule: a property may move to `qualified` **only if** `canQualify`; otherwise the move is refused with a visible
reason. Any other move (including to `rejected`) is allowed. Gates regressing after qualification do not auto-move
the card; the decision shows the new classification and the Command Center raises an alert.

"Ready to acquire" = stage `qualified` AND every approval request for the property has both partners `APPROVED`.
Simulated — not secure authorization.

Phase 2 tightening: readiness additionally requires live `canQualify` and a
nonempty request list. Shared mode requires startup-budget and lease-commitment
requests, plus credit-use when credit is funded; every request needs both
approved slots. The server binds decisions to account membership. Financial,
preference, compliance and evidence changes reset relevant shared decisions to
pending. The default demo retains simulated identities and decisions.

## 4. Advisory investment score (0–100)

`DEFAULT_WEIGHTS = { financialStrength: 30, guestExperience: 15, aesthetics: 10, location: 15, demandStability: 15, operationalSimplicity: 5, evidenceConfidence: 10 }`

- `m(x) = clamp(50 + 50 × x / targetMonthlyProfit, 0, 100)` (target ≤ 0 → use 1500).
- `financialStrength = 0.6 × m(BASE.monthlyAverage.afterFinancingCashFlow) + 0.4 × m(CONSERVATIVE.monthlyAverage.operatingCashFlow)`.
- `guestExperience, aesthetics, location, demandStability, operationalSimplicity` = `property.ratings`.
- `evidenceConfidence` over the property's evidence excluding `SUPERSEDED`: per-record weight
  VERIFIED 1.0, CALCULATED 0.8, ESTIMATED 0.5, OPERATOR_CLAIM 0.35, UNVERIFIED 0.15; × 0.5 if `STALE`; × 0 if
  `DISPUTED` or `INCORRECT`. Value = `100 × Σweight / n`; n = 0 → 0.
- `total = Σ(w × factor) / Σw` (null if Σw = 0). Bands: ≥ 75 strong, ≥ 60 promising, ≥ 45 weak, else poor; null → unavailable.

Expected values for tests (hand-computed):
- factors all 80, weights default → total 80, band strong.
- target 1500, BASE after-fin avg 750, CONSERVATIVE OCF avg −1500 → m = 75 and 0 → financialStrength 45.
- evidence [VERIFIED/CURRENT, ESTIMATED/STALE, UNVERIFIED/DISPUTED, CALCULATED/SUPERSEDED] → (1 + 0.25 + 0) / 3 × 100 = 41.6667.
- all weights 0 → total null, band unavailable.

## 5. Screening checks (advisory, shown independently of gates)

`screenProperty(results, property, preferences): ScreeningCheck[]` — in this order:

| id | label | actual | meets when |
|---|---|---|---|
| startup-preferred | Startup cash vs preferred | BASE startupCashRequirement | ≤ preferredStartupExposure |
| startup-max | Startup cash vs flexible max | same | ≤ maxStartupExposure |
| rent | Monthly rent | property.monthlyRent | ≤ maxMonthlyRent |
| profit | Base after-financing profit / mo | BASE monthlyAverage.afterFinancingCashFlow | ≥ targetMonthlyProfit |
| payback | Base startup payback | BASE paybackMonths (null → unavailable) | ≤ preferredPaybackMonths |
| conservative | Conservative after-financing / mo | CONSERVATIVE monthlyAverage.afterFinancingCashFlow | ≥ −tempLossTolerancePerMonth |
| coc | Base cash-on-cash | BASE cashOnCash (null → unavailable) | ≥ targetCashOnCash |
| rev-rent | Base revenue-to-rent | BASE revenueToRent (null → unavailable) | ≥ targetRevenueToRent |

## 6. Store (single source of truth)

React context + `useReducer`, in memory, resets on refresh. Static records (`markets`, `properties`, `partners`) are
never copied into screens; screens read by id. Mutable state:

The optional Phase 2 controller persists only shared mutable fields through
server actions. `actingPartnerId`, `compare`, `lastViewedPropertyId`, `notice`
and the shared-mode session marker are excluded. Static records and calculated
evaluations remain in code/selector logic. See `phase-2-setup.md`.

```ts
interface DemoState {
  actingPartnerId: PartnerId;
  preferences: PlanningPreferences;
  scoreWeights: ScoreWeights;
  pipeline: Record<PropertyId, PipelineRecord>;
  underwriting: Record<PropertyId, UnderwritingModel>;
  gates: Record<PropertyId, GateRecord[]>;      // manual gates only
  checklist: ChecklistItem[];
  evidence: EvidenceRecord[];
  tasks: Task[];
  approvals: ApprovalRequest[];
  outreach: OutreachDraft[];
  activity: ActivityEvent[];                     // newest first
  compare: PropertyId[];                         // max 3
  lastViewedPropertyId: PropertyId | null;
  notice: { tone: 'positive' | 'warning' | 'critical'; message: string } | null;
}
```

Every mutating action by a partner appends an `ActivityEvent` (actor = acting partner). Required actions:
`RESET_DEMO`, `SET_ACTING_PARTNER`, `TOGGLE_SAVED`, `TOGGLE_COMPARE`, `CLEAR_COMPARE`, `MOVE_STAGE` (enforces §3),
`ASSIGN_PARTNER`, `ADD_NOTE`, `UPDATE_SCENARIO_FIELD`, `UPDATE_STARTUP_FIELD`, `UPDATE_FINANCING_FIELD`,
`UPDATE_MODEL_FIELD` (launchMonth, reserveMonths, blockedNightsPerMonth), `RESET_UNDERWRITING` (property → seed),
`SET_GATE_STATUS` (manual only; calculated → refused), `SET_GATE_NOTE`, `TOGGLE_CHECKLIST_ITEM`,
`UPDATE_EVIDENCE` (classification / reviewStatus / historyState / notes; appends an audit entry; marking REVIEWED sets
reviewer = acting partner; nothing becomes VERIFIED automatically), `ADD_TASK`, `TOGGLE_TASK`, `DECIDE_APPROVAL`
(acting partner decides only their own slot), `CREATE_OUTREACH_DRAFT`, `UPDATE_PREFERENCES`, `UPDATE_SCORE_WEIGHTS`,
`SET_LAST_VIEWED`, `DISMISS_NOTICE`.

Selectors (memoized per state): `usePropertyView(id)` → `{ property, market, pipeline, model, results (4 scenarios),
gates (GateResult[]), decision, score, screening, evidence, tasks, approvals, readyToAcquire }`, plus
`usePortfolioSummary()` for the Command Center. Derived values are never stored.

## 7. Demo dataset rules

- Every property/market has `demo: true` and the UI shows a DEMO DATA marker wherever records appear.
- Real city names for context only. No real street addresses, listing URLs, landlord names, government approvals
  or citations. `sourceUrl` is always `null`. Simulated verifications use `sourceName: "Simulated verification (demo)"`.
- Market figures and regulatory statuses are synthetic and labeled "Modeled" / "Demo assumption — verify with the municipality".
- Property imagery = generated SVG illustrations labeled "Illustration", never photos that could pass as listings.
- Seed timestamps are fixed (relative to 2026-10-11) for determinism.

Archetypes (the dataset-coherence test asserts each outcome with the real engine):

| Archetype | Required outcome |
|---|---|
| finalist ×1 | stage `final-audit`; all gates PASS/N.A.; decision QUALIFIED; one approval with partner-a APPROVED, partner-b PENDING |
| awaiting-consent ×2 | landlord-authorization + lease-permission NEEDS_VERIFICATION; RESEARCH_CANDIDATE; at least one with BASE profit ≥ target (Dayton's modeled market cannot reach the target within realism bounds — accepted deviation) |
| former-str ×2 | furnished, `formerStr: true`, BASE startupCashRequirement ≤ preferredStartupExposure |
| financially-weak ×1 | aesthetics ≥ 90; conservative-performance FAIL → BLOCKED |
| legally-blocked ×1 | hoa or zoning FAIL; financially viable (conservative passes) and score ≥ 70, still BLOCKED |
| high-startup ×1 | capital-feasibility FAIL (startup > 10,000) |
| standard ×6+ | spread across remaining stages incl. one `rejected` |

Realism bounds (enforced by `coherence.test.ts`): platform fee 15.5% host-only model; ADR premium ∈ [0.90, 1.25]
of market ADR; base occupancy within ±0.05 of market; seasonality indices average 1 ± 0.02; BASE revenue÷rent ∈
[1.3, 4.5]. Under these bounds roughly half the demo candidates are BLOCKED — intentional: the platform favours
defensible decisions over finding a deal at any cost.
