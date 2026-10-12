/**
 * StayThesis domain contract (Phase 1).
 * Types only. UI, data and domain modules all depend on this file; it depends on nothing.
 * Monetary values are USD numbers (unrounded). Rates are fractions (0.25 = 25%).
 */

export type ISODate = string;
export type PropertyId = string;
export type MarketId = string;

// ---------------------------------------------------------------------------
// Partners & collaboration (simulated identities — NOT authentication)
// ---------------------------------------------------------------------------

export type PartnerId = 'partner-a' | 'partner-b';
export type ActorId = PartnerId | 'system';

export interface Partner {
  id: PartnerId;
  name: string;
  initials: string;
  focus: string;
}

// ---------------------------------------------------------------------------
// Markets
// ---------------------------------------------------------------------------

export type MarketStatus = 'active-research' | 'watchlist' | 'paused';
export type RegulatoryStatus = 'permit-required' | 'registration-required' | 'restricted' | 'unclear';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type DemandDriverKind =
  | 'university'
  | 'medical'
  | 'corporate'
  | 'events'
  | 'tourism'
  | 'military'
  | 'airport'
  | 'sports';

export interface DemandDriver {
  name: string;
  kind: DemandDriverKind;
  /** 1 (weak) – 5 (strong). Modeled. */
  strength: 1 | 2 | 3 | 4 | 5;
}

/** Monthly multipliers applied to base occupancy and ADR. Index 0 = January. */
export interface SeasonalityIndex {
  occupancyIndex: number;
  adrIndex: number;
}

/** All figures are SYNTHETIC demo values, not current market data. */
export interface MarketMetrics {
  adr: number;
  occupancyRate: number;
  medianRent2br: number;
  /** Modeled gross monthly STR revenue for a typical 2BR. */
  modeledMonthlyRevenue: number;
  activeListings: number;
}

export interface Market {
  id: MarketId;
  city: string;
  state: string;
  stateCode: string;
  coordinates: { lat: number; lng: number };
  status: MarketStatus;
  regulatoryStatus: RegulatoryStatus;
  regulatoryNote: string;
  researchConfidence: ConfidenceLevel;
  metrics: MarketMetrics;
  seasonality: SeasonalityIndex[]; // length 12
  demandDrivers: DemandDriver[];
  summary: string;
  demo: true;
}

// ---------------------------------------------------------------------------
// Properties (static attributes; mutable workflow state lives elsewhere)
// ---------------------------------------------------------------------------

export type PropertyType = 'single-family' | 'townhouse' | 'duplex' | 'adu' | 'condo';
export type FurnishingStatus = 'furnished' | 'partially-furnished' | 'unfurnished';
export type Amenity =
  | 'parking'
  | 'laundry'
  | 'full-kitchen'
  | 'workspace'
  | 'yard'
  | 'air-conditioning'
  | 'ev-charging'
  | 'pet-friendly'
  | 'fast-wifi'
  | 'porch-patio';

/** Qualitative 0–100 ratings used by the advisory score. Demo values. */
export interface PropertyRatings {
  guestExperience: number;
  aesthetics: number;
  location: number;
  demandStability: number;
  /** Higher = simpler to operate (inverse of operational complexity). */
  operationalSimplicity: number;
}

export interface PropertyIllustration {
  /** Key into the illustration palette set. */
  palette: 'slate' | 'sage' | 'brick' | 'cream' | 'navy' | 'clay';
  variant: 'gable' | 'craftsman' | 'modern' | 'rowhouse' | 'cottage' | 'duplex';
}

export interface Property {
  id: PropertyId;
  /** Human code, e.g. "ST-104". */
  code: string;
  /** Fictional display name. Never a real address. */
  name: string;
  marketId: MarketId;
  /** Fictional area descriptor, e.g. "Near-east residential pocket". */
  areaDescriptor: string;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  monthlyRent: number;
  furnishing: FurnishingStatus;
  formerStr: boolean;
  amenities: Amenity[];
  style: string;
  description: string;
  highlights: string[];
  /** Drive-time context to market demand drivers (by driver name). */
  driverAccess: { driverName: string; minutes: number }[];
  ratings: PropertyRatings;
  illustration: PropertyIllustration;
  /** Narrative archetype for the demo, e.g. "legally-blocked". */
  archetype: DemoArchetype;
  demo: true;
}

export type DemoArchetype =
  | 'finalist'
  | 'awaiting-consent'
  | 'former-str'
  | 'financially-weak'
  | 'legally-blocked'
  | 'high-startup'
  | 'standard';

// ---------------------------------------------------------------------------
// Financial engine inputs
// ---------------------------------------------------------------------------

export type ScenarioKey = 'upside' | 'base' | 'conservative' | 'stress';

/** Per-scenario revenue and recurring operating assumptions. */
export interface ScenarioAssumptions {
  // Revenue
  adr: number;
  occupancyRate: number; // base annual occupancy, 0..1, before seasonality
  averageLengthOfStay: number; // nights per stay, >= 1
  cleaningFeePerStay: number; // collected from guest per stay (income)
  ancillaryRevenuePerStay: number; // pet / early check-in etc. collected directly
  discountRate: number; // fraction of accommodation revenue given as discounts
  platformFeeRate: number; // host fee on platform-processed revenue
  paymentProcessingRate: number; // processing on directly collected (ancillary) revenue only
  occupancyTaxRate: number; // pass-through; never operator revenue
  // Fixed monthly expenses
  rent: number;
  utilities: number;
  internet: number;
  insurance: number;
  software: number;
  maintenance: number;
  furnitureReplacement: number;
  permitLicense: number; // monthly allocation of permit/license cost
  otherFixed: number;
  // Variable expenses per turnover
  cleaningCostPerTurnover: number;
  laundryCostPerTurnover: number;
  suppliesPerTurnover: number;
}

export interface StartupCosts {
  /** Rent for the pre-launch setup month (no revenue). Non-refundable startup cost. */
  firstMonthRent: number;
  /** Refundable. Cash requirement, never a P&L expense. */
  securityDeposit: number;
  furnishing: number;
  equipment: number;
  locks: number;
  supplies: number;
  photography: number;
  permitSetup: number;
  contingency: number;
}

export interface FinancingAssumptions {
  /** Requested amount on promotional credit. Capped at credit-eligible startup costs. */
  creditFundedAmount: number;
  /** One-time fee as fraction of credit funded; added to the card balance. */
  upfrontFeeRate: number;
  promoApr: number;
  /** Months the promotional APR applies (months 1..promoMonths). */
  promoMonths: number;
  postPromoApr: number;
  /** Planned payoff period; fixed payment = opening balance / plannedRepaymentMonths. */
  plannedRepaymentMonths: number;
}

export interface UnderwritingModel {
  propertyId: PropertyId;
  /** Calendar month (0 = Jan) of the first operating month; projection runs 12 months from here. */
  launchMonth: number;
  blockedNightsPerMonth: number;
  seasonality: SeasonalityIndex[]; // length 12, calendar order
  reserveMonths: number;
  startup: StartupCosts;
  financing: FinancingAssumptions;
  scenarios: Record<ScenarioKey, ScenarioAssumptions>;
}

// ---------------------------------------------------------------------------
// Financial engine outputs
// ---------------------------------------------------------------------------

export type FinanceWarning =
  | 'invalid-input-sanitized'
  | 'invalid-length-of-stay'
  | 'credit-exceeds-eligible'
  | 'promo-balance-remaining'
  | 'payoff-not-reached';

export interface MonthlyResult {
  projectionMonth: number; // 1..12
  calendarMonth: number; // 0..11
  availableNights: number;
  occupancyRate: number; // effective (after seasonality, clamped 0..1)
  adr: number; // effective (after seasonality)
  bookedNights: number;
  turnovers: number;
  accommodationRevenue: number;
  discounts: number;
  cleaningFeesCollected: number;
  ancillaryRevenue: number;
  grossBookingRevenue: number;
  platformFees: number;
  processingFees: number;
  cleaningExpense: number;
  laundryExpense: number;
  suppliesExpense: number;
  fixedExpenses: number;
  operatingExpenses: number; // fixed + variable (excludes platform/processing fees)
  operatingCashFlow: number;
  debtPayment: number;
  afterFinancingCashFlow: number;
  taxesCollectedPassThrough: number;
}

export interface AnnualTotals {
  bookedNights: number;
  turnovers: number;
  accommodationRevenue: number;
  discounts: number;
  cleaningFeesCollected: number;
  ancillaryRevenue: number;
  grossBookingRevenue: number;
  platformFees: number;
  processingFees: number;
  cleaningExpense: number;
  laundryExpense: number;
  suppliesExpense: number;
  fixedExpenses: number;
  operatingExpenses: number;
  operatingCashFlow: number;
  debtPayments: number;
  afterFinancingCashFlow: number;
  taxesCollectedPassThrough: number;
}

export interface CapitalSummary {
  /** Startup expenses (furnishing..contingency) + first month rent. */
  nonRefundableStartup: number;
  /** furnishing + equipment + locks + supplies + photography + permitSetup + contingency. */
  creditEligibleStartup: number;
  refundableDeposit: number;
  /** nonRefundableStartup + refundableDeposit. Excludes reserve. */
  startupCashRequirement: number;
  /** reserveMonths × monthly fixed recurring expenses. Allocated liquidity, not a cost. */
  operatingReserve: number;
  /** startupCashRequirement + operatingReserve. Denominator for cash-on-cash. */
  totalCommittedCapital: number;
  creditFunded: number;
  /** totalCommittedCapital − creditFunded. */
  cashFunded: number;
}

export interface FinancingScheduleRow {
  month: number; // 1-based payment month
  openingBalance: number;
  apr: number;
  interest: number;
  payment: number;
  closingBalance: number;
  promotional: boolean;
}

export interface FinancingResult {
  creditFunded: number;
  upfrontFee: number;
  openingBalance: number; // creditFunded + upfrontFee
  scheduledPayment: number;
  /** Payment needed per month to clear the opening balance by promo expiry; null if promoMonths = 0 or no balance. */
  requiredMonthlyToClearByPromo: number | null;
  balanceAtPromoExpiry: number;
  totalInterest: number;
  postPromoInterest: number;
  /** Last payment month; 0 if no balance; null if not paid off within 120 months. */
  payoffMonth: number | null;
  schedule: FinancingScheduleRow[];
  warnings: FinanceWarning[];
}

export type BreakEvenStatus = 'achievable' | 'not-achievable' | 'always';

export interface BreakEvenResult {
  /** Base occupancy (0..1) where the annual cash flow is zero; null when not achievable. */
  occupancy: number | null;
  status: BreakEvenStatus;
}

export interface ScenarioResult {
  scenario: ScenarioKey;
  monthly: MonthlyResult[]; // 12 projection months
  annual: AnnualTotals;
  monthlyAverage: {
    grossBookingRevenue: number;
    /** operatingExpenses + platformFees + processingFees */
    recurringExpenses: number;
    operatingCashFlow: number;
    afterFinancingCashFlow: number;
  };
  monthlyFixedExpenses: number;
  operatingMargin: number | null;
  revenueToRent: number | null;
  capital: CapitalSummary;
  financing: FinancingResult;
  /** Year-1 interest + upfront fee. */
  yearOneFinancingCost: number;
  breakEven: { operating: BreakEvenResult; afterFinancing: BreakEvenResult };
  /** (annual OCF − yearOneFinancingCost) / totalCommittedCapital. */
  cashOnCash: number | null;
  /** Same numerator / startupCashRequirement (excludes reserve). */
  cashOnCashExReserve: number | null;
  /** Month in which cumulative (OCF − interest) ≥ nonRefundableStartup + upfrontFee; null if not within 60 months. */
  paybackMonths: number | null;
  warnings: FinanceWarning[];
}

// ---------------------------------------------------------------------------
// Planning preferences (editable, advisory — not objective thresholds)
// ---------------------------------------------------------------------------

export interface PlanningPreferences {
  preferredStartupExposure: number;
  maxStartupExposure: number;
  reserveMonths: number;
  maxMonthlyRent: number;
  targetMonthlyProfit: number;
  preferredPaybackMonths: number;
  tempLossTolerancePerMonth: number;
  tempLossToleranceMonths: number;
  targetCashOnCash: number;
  targetRevenueToRent: number;
  midTermFallbackDays: { min: number; max: number };
}

export type ScreeningStatus = 'meets' | 'misses' | 'unavailable';

export interface ScreeningCheck {
  id: string;
  label: string;
  status: ScreeningStatus;
  actual: number | null;
  target: number;
  format: 'currency' | 'percent' | 'ratio' | 'months';
}

// ---------------------------------------------------------------------------
// Compliance, hard gates, decision, score
// ---------------------------------------------------------------------------

export type GateStatus = 'PASS' | 'FAIL' | 'NEEDS_VERIFICATION' | 'NOT_APPLICABLE';

export type GateCategory =
  | 'str-regulation'
  | 'zoning'
  | 'permit'
  | 'hoa'
  | 'landlord-authorization'
  | 'lease-permission'
  | 'insurance'
  | 'capital-feasibility'
  | 'conservative-performance'
  | 'evidence-quality';

/** Stored, user-editable gate state (manual gates only). */
export interface GateRecord {
  category: GateCategory;
  status: GateStatus;
  note: string;
  updatedAt: ISODate;
  updatedBy: ActorId;
}

export interface GateResult extends GateRecord {
  label: string;
  critical: boolean;
  mode: 'manual' | 'calculated';
}

export interface ChecklistItem {
  id: string;
  propertyId: PropertyId;
  group: 'regulatory' | 'lease' | 'safety' | 'insurance' | 'operations';
  label: string;
  done: boolean;
}

export type ScoreFactor =
  | 'financialStrength'
  | 'guestExperience'
  | 'aesthetics'
  | 'location'
  | 'demandStability'
  | 'operationalSimplicity'
  | 'evidenceConfidence';

export type ScoreWeights = Record<ScoreFactor, number>;

export interface ScoreResult {
  /** 0–100, null if all weights are zero. Advisory only. */
  total: number | null;
  factors: Record<ScoreFactor, number>;
  band: 'strong' | 'promising' | 'weak' | 'poor' | 'unavailable';
}

export type DecisionClass = 'REJECTED' | 'BLOCKED' | 'RESEARCH_CANDIDATE' | 'HOLD_UNRESOLVED' | 'QUALIFIED';

export interface Decision {
  classification: DecisionClass;
  /** True only when every critical gate is PASS or NOT_APPLICABLE. */
  canQualify: boolean;
  failed: GateCategory[];
  unresolved: GateCategory[];
  score: ScoreResult;
  headline: string;
  risks: string[];
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceClassification = 'VERIFIED' | 'CALCULATED' | 'ESTIMATED' | 'UNVERIFIED' | 'OPERATOR_CLAIM';
export type EvidenceHistoryState = 'CURRENT' | 'STALE' | 'SUPERSEDED' | 'DISPUTED' | 'INCORRECT';
export type ReviewStatus = 'UNREVIEWED' | 'IN_REVIEW' | 'REVIEWED' | 'REJECTED';

export interface EvidenceAuditEntry {
  at: ISODate;
  actor: ActorId;
  action: string;
}

export interface EvidenceRecord {
  id: string;
  /** Property or market id. */
  entityId: string;
  metric: string;
  value: string | number;
  units: string | null;
  definition: string;
  classification: EvidenceClassification;
  sourceName: string;
  /** Demo data never carries fabricated URLs; null unless real. */
  sourceUrl: string | null;
  retrievedAt: ISODate | null;
  effectiveAt: ISODate | null;
  observationPeriod: string | null;
  reviewStatus: ReviewStatus;
  reviewer: PartnerId | null;
  notes: string;
  historyState: EvidenceHistoryState;
  gateCategory: GateCategory | null;
  audit: EvidenceAuditEntry[];
}

// ---------------------------------------------------------------------------
// Acquisition pipeline / CRM
// ---------------------------------------------------------------------------

export type AcquisitionStage =
  | 'discovered'
  | 'preliminary-screen'
  | 'researching'
  | 'contacted'
  | 'responded'
  | 'interested'
  | 'underwriting'
  | 'negotiating'
  | 'landlord-approved'
  | 'final-audit'
  | 'qualified'
  | 'rejected';

export interface Note {
  id: string;
  author: PartnerId;
  at: ISODate;
  text: string;
}

export interface PipelineRecord {
  propertyId: PropertyId;
  stage: AcquisitionStage;
  assigneeId: PartnerId | null;
  saved: boolean;
  notes: Note[];
  stageChangedAt: ISODate;
}

export interface Task {
  id: string;
  propertyId: PropertyId | null;
  title: string;
  assigneeId: PartnerId;
  dueDate: ISODate;
  done: boolean;
}

export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface ApprovalRequest {
  id: string;
  propertyId: PropertyId;
  kind: 'startup-budget' | 'lease-commitment' | 'credit-use';
  title: string;
  amount: number;
  requestedBy: PartnerId;
  createdAt: ISODate;
  decisions: Record<PartnerId, ApprovalDecision>;
}

export interface OutreachDraft {
  id: string;
  propertyId: PropertyId;
  author: PartnerId;
  createdAt: ISODate;
  subject: string;
  body: string;
  status: 'DRAFT';
}

export type ActivityKind =
  | 'stage-change'
  | 'gate-change'
  | 'underwriting-change'
  | 'evidence-change'
  | 'note'
  | 'task'
  | 'approval'
  | 'outreach'
  | 'saved'
  | 'assignment'
  | 'system';

export interface ActivityEvent {
  id: string;
  at: ISODate;
  actor: ActorId;
  propertyId: PropertyId | null;
  kind: ActivityKind;
  message: string;
}

/** User-entered provenance. Capture never implies verification. */
export type EvidenceCapture = Pick<EvidenceRecord,
  'entityId' | 'metric' | 'value' | 'units' | 'definition' | 'sourceName' |
  'sourceUrl' | 'retrievedAt' | 'effectiveAt' | 'observationPeriod' | 'notes' | 'gateCategory'>;

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  partnerId: PartnerId;
}
