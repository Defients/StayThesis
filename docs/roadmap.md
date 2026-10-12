# Roadmap

Phase 1 remains the default offline demo. Phase 2's shared pilot is now
implemented locally; cloud provisioning and hosted validation remain pending.
See [Phase 2 setup](phase-2-setup.md) for setup, checks and limitations.

## Phase 2 — shared records (smallest next step)

Goal: two real partners editing the same pipeline. Supabase is the selected
optional backend; no project or deployment has been created:

- **Implemented locally:** password sign-in, owner-managed two-account
  membership, RLS read isolation, server-only action commits, version conflicts,
  safe retries, polling, shared mutable records and a separate audit event log.
- **Implemented locally:** approvals bound to authenticated partner slots;
  financial/compliance changes reset earlier decisions. Unknown gates still
  block qualification, and the server recomputes financial gates.
- **Implemented locally:** manual evidence capture with source metadata and
  audit history. Capture never verifies a record or passes a gate.
- **Pending:** new Supabase project, two real accounts, migration/function
  deployment, hosted authorization/security checks, and a configured app build.
- **Future:** real-property/market CRUD, document upload/storage, municipal
  lookups, normalized tables, backup/restore and production account recovery.
  Inventory and market metrics are still synthetic; no outreach is sent.

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
