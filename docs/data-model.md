# Data model

All entities are defined in `src/domain/types.ts` — the single contract file
that imports nothing. Demo instances are seeded in `src/data/demo/`.

## Entities

| Type | Role | Notes |
| --- | --- | --- |
| `Partner` | Simulated team member | `partner-a` Joe (underwriting/finance), `partner-b` Deffy (markets/landlord relations). `ActorId` adds `system`. |
| `Market` | Research market | `MarketStatus` (active-research/watchlist/paused), `RegulatoryStatus`, `MarketMetrics` (ADR, occupancy, rev÷rent…), `DemandDriver[]`, `SeasonalityIndex[]` (12 months). |
| `Property` | Candidate | `PropertyType`, beds/baths/sqft, rent, furnishing, amenity list, `PropertyRatings`, `DemoArchetype`, illustration descriptor. |
| `UnderwritingModel` | Editable inputs per property | `ScenarioAssumptions` ×4 (upside/base/conservative/stress), `StartupCosts`, `FinancingAssumptions`, launch month, reserve months, blocked nights. |
| `ScenarioResult` | Derived — never stored | `MonthlyResult[12]` + `AnnualTotals` + `CapitalSummary` + `FinancingResult` + `BreakEvenResult` + `FinanceWarning[]`. |
| `PlanningPreferences` | Advisory thresholds | Max startup exposure, target profit, reserve months, payback, CoC, rev÷rent, loss tolerance, mid-term fallback. |
| `GateRecord` / `GateResult` | Compliance gates | 10 gates; `GateStatus` PASS/FAIL/NEEDS_VERIFICATION/NOT_APPLICABLE; manual gates stored, calculated gates derived. |
| `ChecklistItem` | Compliance checklist | User-toggleable evidence-gathering items. |
| `ScoreResult` / `ScoreWeights` | Advisory score | `ScoreFactor` values 0–100; editable weights never override gates. |
| `Decision` | Derived classification | REJECTED / BLOCKED / RESEARCH_CANDIDATE / HOLD_UNRESOLVED / QUALIFIED + `canQualify` + risks. |
| `EvidenceRecord` | Compliance evidence | `EvidenceClassification` (VERIFIED/CALCULATED/ESTIMATED/UNVERIFIED/OPERATOR_CLAIM), `EvidenceHistoryState`, `ReviewStatus`, source, `EvidenceAuditEntry[]`. |
| `PipelineRecord` | CRM state per property | `AcquisitionStage` (12 stages), assignee, saved flag. |
| `Note`, `Task` | CRM collaboration | Per-property or global. |
| `ApprovalRequest` | Dual-partner approvals | Per-partner `ApprovalDecision` slots; only the acting partner's slot is mutable. |
| `OutreachDraft` | Draft-only outreach | Subject/body; never sent in Phase 1. |
| `ActivityEvent` | Audit/feed | `ActivityKind` + actor + message; reducer-generated. |

## Markets (7)

| ID | City | Status |
| --- | --- | --- |
| `columbus-oh` | Columbus, OH | active-research |
| `dayton-oh` | Dayton, OH | active-research |
| `columbus-ga` | Columbus, GA | active-research |
| `cleveland-oh` | Cleveland, OH | active-research |
| `fort-wayne-in` | Fort Wayne, IN | active-research |
| `cincinnati-oh` | Cincinnati, OH | watchlist |
| `indianapolis-in` | Indianapolis, IN | watchlist |

## Properties (14)

Stage and decision reflect the **seed** (stages from `STAGE_OF` in
`seed.ts`; decisions are engine output on the seed — they change as gates and
scenarios are edited).

| Code | Name | Market | Archetype | Seed stage | Seed decision |
| --- | --- | --- | --- | --- | --- |
| ST-101 | Bexley Courtyard Townhome | columbus-oh | finalist | final-audit | QUALIFIED |
| ST-102 | Uptown Brick Flat | columbus-ga | legally-blocked | underwriting | BLOCKED |
| ST-103 | Lakeview Designer Loft | cleveland-oh | financially-weak | underwriting | BLOCKED |
| ST-104 | Westbend Duplex Unit B | fort-wayne-in | high-startup | preliminary-screen | BLOCKED |
| ST-105 | Oregon District Flat | dayton-oh | awaiting-consent | contacted | RESEARCH_CANDIDATE |
| ST-106 | Short North Carriage Flat | columbus-oh | awaiting-consent | responded | RESEARCH_CANDIDATE |
| ST-107 | Tremont Porch House | cleveland-oh | former-str | underwriting | RESEARCH_CANDIDATE |
| ST-108 | Lakeside Carriage Cottage | fort-wayne-in | former-str | negotiating | BLOCKED |
| ST-109 | OTR Corner Rowhouse | cincinnati-oh | standard | interested | BLOCKED |
| ST-110 | Fountain Square Flat | indianapolis-in | standard | discovered | BLOCKED |
| ST-111 | Grandview Attic Suite | columbus-oh | standard | researching | RESEARCH_CANDIDATE |
| ST-112 | South Park Craftsman | dayton-oh | standard | responded | BLOCKED |
| ST-113 | Ohio City Overlook | cleveland-oh | standard | rejected | REJECTED |
| ST-114 | Riverside Ranch | fort-wayne-in | standard | preliminary-screen | BLOCKED |

## Realism bounds (enforced by `coherence.test.ts`)

- `adrPremium` ∈ [0.90, 1.25]; premiums >1.1 justified in the property's
  description/highlights.
- `baseOccupancy` within market occupancy ± 0.05.
- Each market's seasonality: mean `occupancyIndex` and mean `adrIndex` within
  1 ± 0.02.
- Every property's BASE revenue÷rent ∈ **[1.3, 4.5]** — widened from the
  spec's 3.0 ceiling, which is infeasible under the 15.5% host-fee model
  (see `docs/implementation-status.md`).
- `platformFeeRate` default 0.155 (host-only fee; ADR is the guest-facing
  nightly price; processing applies to ancillary only).
- Seed `creditFundedAmount = min(2500, floor(eligible/100)·100)` — no seed
  BASE result carries the `credit-exceeds-eligible` warning.
- ESTIMATED ADR/occupancy evidence values equal the property's seed BASE
  assumptions; `CALCULATED` records display live engine values.
