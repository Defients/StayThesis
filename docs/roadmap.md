# Roadmap

Everything below is **not implemented**. Phase 1 is a single-user, in-memory
demo workspace.

## Phase 2 — shared records (smallest next step)

Goal: two real partners editing the same pipeline. Options, not decisions —
the constraint is staying on a $0 free-tier stack:

- **Private shared records + auth** — e.g. Supabase (Postgres + Auth + RLS) or
  Firebase free tier. `DemoState`/`Action` map naturally onto tables + an
  append-only event log; the reducer becomes the client-side projection.
- **Server-enforced dual approval** — the client already restricts
  `DECIDE_APPROVAL` to the acting partner's slot; a DB rule/edge function
  enforces it with real identity and blocks self-approval on
  partner-requested items if desired.
- **Real evidence capture** — `EvidenceRecord` already models source,
  retrieval/effective dates, observation period, classification and audit;
  wire real documents/URLs and municipal lookups into the same shape.
- **Persistence of edits** — underwriting overrides, gate records, notes,
  tasks and pipeline moves persist; activity log becomes shared.
- Seams documented in `docs/architecture.md` were designed for this.

## Phase 3 — operations (post-acquisition)

Beyond the acquisition thesis — once a unit is live:

- **Reservations & availability** — booking calendar, blocked dates,
  channel sync (Airbnb/Vrbo iCal or a channel manager).
- **Turnover ops** — cleaner scheduling (e.g. Turno), checklists per
  turnover, supply restock alerts.
- **PMS-lite** — guest records, stay ledger, issue log.
- **Pricing** — dynamic pricing feed (PriceLabs-class), min-stay rules,
  seasonality adjustments vs the Phase 1 static seasonality model.
- **Smart locks** — per-stay codes (e.g. RemoteLock/August integrations).
- **Guest comms** — templated pre-arrival/check-in/house-rules messaging
  (the Phase 1 outreach draft generator is the pattern).
- **Accounting** — expense ledger, per-property P&L vs the underwriting
  model, tax export (occupancy-tax pass-through is already modeled).
