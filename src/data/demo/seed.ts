import type {
  AcquisitionStage,
  ActivityEvent,
  ApprovalRequest,
  ChecklistItem,
  EvidenceClassification,
  EvidenceHistoryState,
  EvidenceRecord,
  GateCategory,
  GateRecord,
  GateStatus,
  Note,
  OutreachDraft,
  PipelineRecord,
  PropertyId,
  ReviewStatus,
  Task,
  UnderwritingModel,
} from '@/domain/types';
import { computeScenario } from '@/domain/finance';
import { generateOutreachDraft } from '@/domain/crm';
import { marketById } from './markets';
import { PROPERTIES, propertyById } from './properties';
import { PARTNERS } from './partners';
import { buildSeedUnderwriting, type UnderwritingSeedOverrides } from './underwriting';

const T = (iso: string) => `${iso}T00:00:00.000Z`;

// ---------------------------------------------------------------------------
// Per-property seed tunings (verified by coherence.test.ts)
// ---------------------------------------------------------------------------

// adrPremium is bounded to [0.90, 1.25] and baseOccupancy to market ±0.05 —
// premiums >1.1 must be justified in the property's description/highlights.
export const UNDERWRITING_OVERRIDES: Record<PropertyId, UnderwritingSeedOverrides> = {
  'st-finalist': { adrPremium: 1.25, baseOccupancy: 0.73 },
  'st-blocked': {
    adrPremium: 1.25,
    baseOccupancy: 0.63,
    // Proven-STR unit on a low rent basis: longer stays, lean turnover crew,
    // light fixed costs — the numbers clear, only the HOA gate blocks it.
    base: {
      averageLengthOfStay: 4,
      cleaningFeePerStay: 120,
      cleaningCostPerTurnover: 85,
      ancillaryRevenuePerStay: 12,
      discountRate: 0.03,
      utilities: 200,
      maintenance: 90,
    },
  },
  'st-weak': { adrPremium: 1.1 },
  'st-highstartup': { adrPremium: 1.15, startup: { furnishing: 8800 } },
  'st-consent-dayton': {
    adrPremium: 1.25,
    baseOccupancy: 0.63,
    financing: { creditFundedAmount: 1500 },
    base: {
      averageLengthOfStay: 4,
      cleaningFeePerStay: 120,
      cleaningCostPerTurnover: 85,
      ancillaryRevenuePerStay: 15,
      discountRate: 0.03,
    },
  },
  'st-consent-cbus': {
    adrPremium: 1.25,
    baseOccupancy: 0.73,
    // Boutique ADU at a mid-market rent — the strongest consent-pending deal.
    base: {
      averageLengthOfStay: 4,
      cleaningFeePerStay: 140,
      cleaningCostPerTurnover: 85,
      ancillaryRevenuePerStay: 15,
      discountRate: 0.03,
    },
  },
  'st-former-cle': {
    adrPremium: 1.25,
    baseOccupancy: 0.59,
    // Former-STR mix skews to longer stays.
    base: {
      averageLengthOfStay: 4,
      cleaningFeePerStay: 115,
      cleaningCostPerTurnover: 85,
      ancillaryRevenuePerStay: 12,
    },
  },
  'st-former-fw': { adrPremium: 1.25, baseOccupancy: 0.55 },
  'st-std-cincy': { adrPremium: 1.25, baseOccupancy: 0.65 },
  'st-std-indy': { adrPremium: 1.2, baseOccupancy: 0.63 },
  'st-std-cbus2': { adrPremium: 1.05, baseOccupancy: 0.7 },
  'st-std-dayton': { adrPremium: 1.15, baseOccupancy: 0.58 },
  'st-std-cle2': { adrPremium: 1.0 },
  'st-std-fw2': { adrPremium: 1.2, baseOccupancy: 0.52 },
};

export function buildUnderwritingSeed(): Record<PropertyId, UnderwritingModel> {
  const out: Record<PropertyId, UnderwritingModel> = {};
  for (const p of PROPERTIES) {
    const market = marketById(p.marketId);
    if (!market) throw new Error(`No market ${p.marketId} for ${p.id}`);
    out[p.id] = buildSeedUnderwriting(p, market, UNDERWRITING_OVERRIDES[p.id]);
  }
  return out;
}

/** Rebuild one property's seed underwriting model (used by RESET_UNDERWRITING). */
export function buildSeedModel(propertyId: PropertyId): UnderwritingModel | null {
  const property = propertyById(propertyId);
  if (!property) return null;
  const market = marketById(property.marketId);
  if (!market) return null;
  return buildSeedUnderwriting(
    property,
    market,
    UNDERWRITING_OVERRIDES[propertyId],
  );
}

// ---------------------------------------------------------------------------
// Manual gate records (calculated gates are never seeded)
// ---------------------------------------------------------------------------

type GateSeed = Partial<Record<GateCategory, GateStatus>>;
const GATE_NOTES: Partial<Record<PropertyId, Partial<Record<GateCategory, string>>>> = {
  'st-blocked': {
    hoa: 'Building bylaws prohibit rentals under 30 days (demo record)',
    'str-regulation': 'Market overlay restricted — verification pending',
  },
  'st-std-cle2': {
    'landlord-authorization': 'Owner declined guest-stay use (demo record)',
  },
  'st-finalist': {
    'landlord-authorization': 'Written consent term sheet received (demo)',
    'lease-permission': 'Sublet/STR clause drafted into lease addendum (demo)',
  },
};

const MANUAL: GateCategory[] = [
  'str-regulation',
  'zoning',
  'permit',
  'hoa',
  'landlord-authorization',
  'lease-permission',
  'insurance',
  'evidence-quality',
];

const ALL_PASS: GateSeed = {
  'str-regulation': 'PASS',
  zoning: 'PASS',
  permit: 'PASS',
  hoa: 'PASS',
  'landlord-authorization': 'PASS',
  'lease-permission': 'PASS',
  insurance: 'PASS',
  'evidence-quality': 'PASS',
};

const ALL_NV: GateSeed = {
  'str-regulation': 'NEEDS_VERIFICATION',
  zoning: 'NEEDS_VERIFICATION',
  permit: 'NEEDS_VERIFICATION',
  hoa: 'NEEDS_VERIFICATION',
  'landlord-authorization': 'NEEDS_VERIFICATION',
  'lease-permission': 'NEEDS_VERIFICATION',
  insurance: 'NEEDS_VERIFICATION',
  'evidence-quality': 'NEEDS_VERIFICATION',
};

const GATE_SEEDS: Record<PropertyId, GateSeed> = {
  'st-finalist': ALL_PASS,
  'st-blocked': {
    ...ALL_PASS,
    hoa: 'FAIL',
    'str-regulation': 'NEEDS_VERIFICATION',
    permit: 'NEEDS_VERIFICATION',
  },
  'st-weak': ALL_PASS,
  'st-highstartup': {
    ...ALL_NV,
    'landlord-authorization': 'PASS',
    'lease-permission': 'PASS',
  },
  'st-consent-dayton': {
    ...ALL_PASS,
    'landlord-authorization': 'NEEDS_VERIFICATION',
    'lease-permission': 'NEEDS_VERIFICATION',
  },
  'st-consent-cbus': {
    ...ALL_PASS,
    'landlord-authorization': 'NEEDS_VERIFICATION',
    'lease-permission': 'NEEDS_VERIFICATION',
  },
  'st-former-cle': {
    ...ALL_PASS,
    'lease-permission': 'NEEDS_VERIFICATION',
  },
  'st-former-fw': {
    ...ALL_PASS,
    'landlord-authorization': 'NEEDS_VERIFICATION',
    'lease-permission': 'NEEDS_VERIFICATION',
  },
  'st-std-cincy': {
    ...ALL_NV,
    hoa: 'PASS',
    'landlord-authorization': 'NEEDS_VERIFICATION',
  },
  'st-std-indy': ALL_NV,
  'st-std-cbus2': { ...ALL_NV, 'str-regulation': 'PASS' },
  'st-std-dayton': { ...ALL_NV, 'str-regulation': 'PASS', zoning: 'PASS' },
  'st-std-cle2': {
    ...ALL_PASS,
    'landlord-authorization': 'FAIL',
    'lease-permission': 'NEEDS_VERIFICATION',
  },
  'st-std-fw2': ALL_NV,
};

export function buildGateSeed(): Record<PropertyId, GateRecord[]> {
  const out: Record<PropertyId, GateRecord[]> = {};
  for (const p of PROPERTIES) {
    const seed = GATE_SEEDS[p.id] ?? ALL_NV;
    out[p.id] = MANUAL.map((category) => ({
      category,
      status: seed[category] ?? 'NEEDS_VERIFICATION',
      note: GATE_NOTES[p.id]?.[category] ?? '',
      updatedAt: T('2026-10-06'),
      updatedBy: 'partner-a' as const,
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pipeline records
// ---------------------------------------------------------------------------

export const STAGE_OF: Record<PropertyId, AcquisitionStage> = {
  'st-finalist': 'final-audit',
  'st-blocked': 'underwriting',
  'st-weak': 'underwriting',
  'st-highstartup': 'preliminary-screen',
  'st-consent-dayton': 'contacted',
  'st-consent-cbus': 'responded',
  'st-former-cle': 'underwriting',
  'st-former-fw': 'negotiating',
  'st-std-cincy': 'interested',
  'st-std-indy': 'discovered',
  'st-std-cbus2': 'researching',
  'st-std-dayton': 'responded',
  'st-std-cle2': 'rejected',
  'st-std-fw2': 'preliminary-screen',
};

const SAVED: PropertyId[] = ['st-finalist', 'st-consent-cbus', 'st-former-cle'];
const ASSIGNEE: Record<PropertyId, 'partner-a' | 'partner-b'> = {
  'st-finalist': 'partner-a',
  'st-blocked': 'partner-b',
  'st-weak': 'partner-a',
  'st-highstartup': 'partner-a',
  'st-consent-dayton': 'partner-b',
  'st-consent-cbus': 'partner-a',
  'st-former-cle': 'partner-b',
  'st-former-fw': 'partner-b',
  'st-std-cincy': 'partner-b',
  'st-std-indy': 'partner-b',
  'st-std-cbus2': 'partner-a',
  'st-std-dayton': 'partner-b',
  'st-std-cle2': 'partner-a',
  'st-std-fw2': 'partner-a',
};

const PROPERTY_NOTES: Record<PropertyId, Note[]> = {
  'st-finalist': [
    {
      id: 'note-001',
      author: 'partner-a',
      at: T('2026-10-09'),
      text: 'Final-audit checklist nearly done — lease addendum language reviewed against the consent term sheet.',
    },
    {
      id: 'note-002',
      author: 'partner-b',
      at: T('2026-10-10'),
      text: 'Conservative case still clears the gate. Comfortable sending the commitment approval.',
    },
  ],
  'st-consent-cbus': [
    {
      id: 'note-003',
      author: 'partner-b',
      at: T('2026-10-08'),
      text: 'Owner responded — open to furnished stays but wants the sublet clause spelled out. Drafting outreach follow-up.',
    },
  ],
  'st-consent-dayton': [
    {
      id: 'note-004',
      author: 'partner-b',
      at: T('2026-10-05'),
      text: 'Great numbers for the market. Only open item is landlord consent on subletting.',
    },
  ],
  'st-blocked': [
    {
      id: 'note-005',
      author: 'partner-a',
      at: T('2026-09-28'),
      text: 'Bylaws explicitly prohibit stays under 30 days. Parking this unless the association changes posture.',
    },
  ],
  'st-weak': [
    {
      id: 'note-006',
      author: 'partner-a',
      at: T('2026-10-02'),
      text: 'Beautiful unit, but the conservative case bleeds. Would need a major rent concession.',
    },
  ],
};

export function buildPipelineSeed(): Record<PropertyId, PipelineRecord> {
  const out: Record<PropertyId, PipelineRecord> = {};
  for (const p of PROPERTIES) {
    out[p.id] = {
      propertyId: p.id,
      stage: STAGE_OF[p.id] ?? 'discovered',
      assigneeId: ASSIGNEE[p.id] ?? 'partner-a',
      saved: SAVED.includes(p.id),
      notes: (PROPERTY_NOTES[p.id] ?? []).map((n) => ({ ...n })),
      stageChangedAt: T('2026-10-04'),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Evidence (sourceUrl is always null; sourceName describes the origin)
// ---------------------------------------------------------------------------

interface EvidenceSeed {
  metric: string;
  value: string | number;
  units: string | null;
  definition: string;
  classification: EvidenceClassification;
  sourceName: string;
  historyState?: EvidenceHistoryState;
  reviewStatus?: ReviewStatus;
  notes?: string;
  gateCategory?: GateCategory | null;
}

const PER_PROPERTY_EVIDENCE: Record<PropertyId, EvidenceSeed[]> = {
  'st-finalist': [
    {
      metric: 'permit-eligibility', value: 'Eligible (simulated)', units: null,
      definition: 'Preliminary STR permit eligibility for the property zone',
      classification: 'VERIFIED', sourceName: 'Simulated verification (demo)',
      gateCategory: 'permit',
      notes: 'Simulated verification against demo rules.',
    },
    {
      metric: 'landlord-consent', value: 'Term sheet received', units: null,
      definition: 'Written landlord consent to furnished guest stays',
      classification: 'VERIFIED', sourceName: 'Simulated verification (demo)',
      gateCategory: 'landlord-authorization',
    },
  ],
  'st-weak': [
    {
      metric: 'occupancy', value: 0.5, units: 'fraction', definition: 'Modeled annual occupancy',
      classification: 'ESTIMATED', sourceName: 'Synthetic market model', historyState: 'STALE',
      notes: 'Estimate predates the last seasonality refresh.',
    },
  ],
  'st-highstartup': [
    {
      metric: 'monthlyRent', value: 1250, units: 'USD/month', definition: 'Asking rent shown in original listing',
      classification: 'OPERATOR_CLAIM', sourceName: 'Listing (demo)', historyState: 'DISPUTED',
      notes: 'Listing showed a higher ask than the current advertised rent.',
    },
  ],
};

const standardEvidence = (propertyRent: number): EvidenceSeed[] => [
  {
    metric: 'monthlyRent', value: propertyRent, units: 'USD/month',
    definition: 'Advertised monthly rent for the unit',
    classification: 'OPERATOR_CLAIM', sourceName: 'Listing (demo)',
  },
  {
    metric: 'adr', value: 0, units: 'USD/night',
    definition: 'Modeled average daily rate for a comparable furnished 2BR',
    classification: 'ESTIMATED', sourceName: 'Synthetic market model',
  },
  {
    metric: 'occupancy', value: 0, units: 'fraction',
    definition: 'Modeled annual occupancy for a comparable furnished 2BR',
    classification: 'ESTIMATED', sourceName: 'Synthetic market model',
  },
  {
    metric: 'projectedRevenue', value: 0, units: 'USD/year',
    definition: 'Projected gross booking revenue from the underwriting model',
    classification: 'CALCULATED', sourceName: 'StayThesis engine',
  },
];

export function buildEvidenceSeed(): EvidenceRecord[] {
  const out: EvidenceRecord[] = [];
  let n = 0;
  for (const p of PROPERTIES) {
    const market = marketById(p.marketId)!;
    // ESTIMATED records store the property's seed BASE assumptions so they stay
    // consistent with the underwriting model; CALCULATED engine metrics carry a
    // placeholder — selectors display live derived values instead.
    const seedModel = buildSeedUnderwriting(
      p,
      market,
      UNDERWRITING_OVERRIDES[p.id],
    );
    const base: EvidenceSeed[] = [
      ...standardEvidence(p.monthlyRent).map((e) =>
        e.metric === 'adr'
          ? { ...e, value: seedModel.scenarios.base.adr }
          : e.metric === 'occupancy'
            ? { ...e, value: seedModel.scenarios.base.occupancyRate }
            : e.metric === 'projectedRevenue'
              ? { ...e, value: 0 }
              : e,
      ),
      ...(PER_PROPERTY_EVIDENCE[p.id] ?? []),
    ];
    for (const e of base) {
      n += 1;
      out.push({
        id: `ev-${String(n).padStart(3, '0')}`,
        entityId: p.id,
        metric: e.metric,
        value: e.value,
        units: e.units,
        definition: e.definition,
        classification: e.classification,
        sourceName: e.sourceName,
        sourceUrl: null,
        retrievedAt: T('2026-09-25'),
        effectiveAt: T('2026-09-25'),
        observationPeriod: e.classification === 'ESTIMATED' ? '12-month modeled window' : null,
        reviewStatus: e.reviewStatus ?? (e.classification === 'VERIFIED' ? 'REVIEWED' : 'UNREVIEWED'),
        reviewer: e.classification === 'VERIFIED' ? 'partner-a' : null,
        notes: e.notes ?? '',
        historyState: e.historyState ?? 'CURRENT',
        gateCategory: e.gateCategory ?? null,
        audit: [
          {
            at: T('2026-09-25'),
            actor: 'partner-a',
            action: 'Seeded evidence record',
          },
        ],
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Checklist, tasks, approvals, outreach, activity
// ---------------------------------------------------------------------------

const CHECKLIST_GROUPS: { group: ChecklistItem['group']; label: string }[] = [
  { group: 'regulatory', label: 'Confirm municipal STR registration path' },
  { group: 'regulatory', label: 'Verify property-level zoning allows guest stays' },
  { group: 'lease', label: 'Secure written landlord authorization in lease' },
  { group: 'safety', label: 'Install smart lock + safety kit' },
  { group: 'insurance', label: 'Bind STR-appropriate liability policy' },
  { group: 'operations', label: 'Book cleaner + first guest-ready photo set' },
];

const CHECKLIST_DONE: Partial<Record<PropertyId, number>> = {
  'st-finalist': 5,
  'st-consent-cbus': 2,
  'st-consent-dayton': 2,
  'st-former-cle': 3,
  'st-blocked': 3,
  'st-weak': 4,
  'st-former-fw': 3,
  'st-std-cbus2': 1,
  'st-std-dayton': 1,
};

export function buildChecklistSeed(): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const p of PROPERTIES) {
    const doneUpTo = CHECKLIST_DONE[p.id] ?? 0;
    CHECKLIST_GROUPS.forEach((g, i) => {
      out.push({
        id: `chk-${p.id}-${i + 1}`,
        propertyId: p.id,
        group: g.group,
        label: g.label,
        done: i < doneUpTo,
      });
    });
  }
  return out;
}

export function buildTaskSeed(): Task[] {
  const seed: [PropertyId | null, string, 'partner-a' | 'partner-b', string, boolean][] = [
    ['st-finalist', 'Send lease-commitment approval to Sam for sign-off', 'partner-a', '2026-10-13', false],
    ['st-finalist', 'Re-run underwriting with signed-rent figure', 'partner-a', '2026-10-14', false],
    ['st-consent-cbus', 'Send follow-up with sublet clause draft', 'partner-b', '2026-10-12', false],
    ['st-consent-dayton', 'Call owner re: furnished-stay authorization', 'partner-b', '2026-10-15', false],
    ['st-former-cle', 'Pull prior operator occupancy export', 'partner-b', '2026-10-16', false],
    ['st-blocked', 'Document HOA bylaw clause for the record', 'partner-a', '2026-10-11', true],
    ['st-std-cincy', 'Sanity-check watchlist rents vs ADR', 'partner-b', '2026-10-18', false],
    [null, 'Weekly pipeline review with partner', 'partner-a', '2026-10-12', false],
  ];
  return seed.map(([propertyId, title, assigneeId, dueDate, done], i) => ({
    id: `task-${String(i + 1).padStart(3, '0')}`,
    propertyId,
    title,
    assigneeId,
    dueDate,
    done,
  }));
}

export function buildApprovalSeed(
  underwriting: Record<PropertyId, UnderwritingModel>,
): ApprovalRequest[] {
  const finalistStartupCash = computeScenario(
    underwriting['st-finalist']!,
    'base',
  ).capital.startupCashRequirement;
  return [
    {
      id: 'appr-001',
      propertyId: 'st-finalist',
      kind: 'lease-commitment',
      title: 'Commit to lease — Bexley Courtyard Townhome',
      amount: Math.round(finalistStartupCash),
      requestedBy: 'partner-a',
      createdAt: T('2026-10-10'),
      decisions: { 'partner-a': 'APPROVED', 'partner-b': 'PENDING' },
    },
    {
      id: 'appr-002',
      propertyId: 'st-consent-cbus',
      kind: 'startup-budget',
      title: 'Startup budget — Short North Carriage Flat',
      amount: 6000,
      requestedBy: 'partner-b',
      createdAt: T('2026-10-09'),
      decisions: { 'partner-a': 'PENDING', 'partner-b': 'PENDING' },
    },
    {
      id: 'appr-003',
      propertyId: 'st-former-cle',
      kind: 'credit-use',
      title: 'Promotional credit for furnishing top-up',
      amount: 2500,
      requestedBy: 'partner-a',
      createdAt: T('2026-10-07'),
      decisions: { 'partner-a': 'APPROVED', 'partner-b': 'PENDING' },
    },
  ];
}

export function buildOutreachSeed(): OutreachDraft[] {
  const property = propertyById('st-consent-dayton')!;
  const market = marketById(property.marketId)!;
  const draft = generateOutreachDraft(property, market, PARTNERS['partner-b']);
  return [
    {
      id: 'outreach-001',
      propertyId: property.id,
      author: 'partner-b',
      createdAt: T('2026-10-08'),
      subject: draft.subject,
      body: draft.body,
      status: 'DRAFT',
    },
  ];
}

export function buildActivitySeed(): ActivityEvent[] {
  const seed: [string, ActivityEvent['actor'], PropertyId | null, ActivityEvent['kind'], string][] = [
    ['2026-10-11', 'partner-a', 'st-finalist', 'stage-change', 'Moved Bexley Courtyard Townhome to Final audit'],
    ['2026-10-10', 'partner-a', 'st-finalist', 'approval', 'Requested lease-commitment approval'],
    ['2026-10-10', 'partner-b', 'st-consent-cbus', 'note', 'Noted landlord response on sublet clause'],
    ['2026-10-09', 'partner-b', 'st-consent-cbus', 'approval', 'Requested startup-budget approval'],
    ['2026-10-08', 'partner-b', 'st-consent-dayton', 'outreach', 'Drafted landlord outreach'],
    ['2026-10-07', 'partner-a', 'st-former-cle', 'approval', 'Requested credit-use approval'],
    ['2026-10-06', 'partner-a', 'st-finalist', 'gate-change', 'Marked landlord authorization PASS'],
    ['2026-10-05', 'partner-b', 'st-consent-dayton', 'note', 'Logged consent-only open item'],
    ['2026-10-03', 'partner-a', 'st-weak', 'underwriting-change', 'Updated conservative case — still negative'],
    ['2026-10-02', 'partner-b', 'st-former-fw', 'stage-change', 'Moved Lakeside Carriage Cottage to Negotiating'],
    ['2026-09-28', 'partner-a', 'st-blocked', 'gate-change', 'Marked HOA / building restrictions FAIL'],
    ['2026-09-20', 'system', null, 'system', 'Demo workspace seeded'],
  ];
  return seed.map(([at, actor, propertyId, kind, message], i) => ({
    id: `act-${String(i + 1).padStart(3, '0')}`,
    at: T(at),
    actor,
    propertyId,
    kind,
    message,
  }));
}

// ---------------------------------------------------------------------------
// Aggregate seed
// ---------------------------------------------------------------------------

export interface DemoSeed {
  pipeline: Record<PropertyId, PipelineRecord>;
  underwriting: Record<PropertyId, UnderwritingModel>;
  gates: Record<PropertyId, GateRecord[]>;
  checklist: ChecklistItem[];
  evidence: EvidenceRecord[];
  tasks: Task[];
  approvals: ApprovalRequest[];
  outreach: OutreachDraft[];
  activity: ActivityEvent[];
}

export function buildDemoSeed(): DemoSeed {
  const underwriting = buildUnderwritingSeed();
  return {
    pipeline: buildPipelineSeed(),
    underwriting,
    gates: buildGateSeed(),
    checklist: buildChecklistSeed(),
    evidence: buildEvidenceSeed(),
    tasks: buildTaskSeed(),
    approvals: buildApprovalSeed(underwriting),
    outreach: buildOutreachSeed(),
    activity: buildActivitySeed(),
  };
}
