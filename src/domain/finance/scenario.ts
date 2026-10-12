import type {
  AnnualTotals,
  FinanceWarning,
  MonthlyResult,
  ScenarioAssumptions,
  ScenarioKey,
  ScenarioResult,
  SeasonalityIndex,
  UnderwritingModel,
} from '../types';
import { availableNights, calendarMonthFor } from './calendar';
import { computeCapital } from './capital';
import { computeFinancing } from './financing';
import { solveBreakEven } from './breakeven';
import { sanitizeModelCore, sanitizeScenario } from './sanitize';

export const SCENARIO_KEYS: ScenarioKey[] = [
  'upside',
  'base',
  'conservative',
  'stress',
];

const PAYBACK_HORIZON_MONTHS = 60;
const NEUTRAL_INDEX: SeasonalityIndex = { occupancyIndex: 1, adrIndex: 1 };

type SanitizedCommon = ReturnType<typeof sanitizeModelCore>['value'];

function monthlyFixedExpenses(a: ScenarioAssumptions): number {
  return (
    a.rent +
    a.utilities +
    a.internet +
    a.insurance +
    a.software +
    a.maintenance +
    a.furnitureReplacement +
    a.permitLicense +
    a.otherFixed
  );
}

interface MonthEconomics {
  occupancyRate: number;
  adr: number;
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
  taxesCollectedPassThrough: number;
}

/** Per-month revenue and variable-expense math (spec §3). */
function monthEconomics(
  a: ScenarioAssumptions,
  nights: number,
  index: SeasonalityIndex,
  occupancyOverride?: number,
): MonthEconomics {
  const occupancyRate = Math.min(
    1,
    Math.max(0, (occupancyOverride ?? a.occupancyRate) * index.occupancyIndex),
  );
  const adr = a.adr * index.adrIndex;
  const bookedNights = nights * occupancyRate;
  const turnovers = bookedNights / a.averageLengthOfStay;
  const accommodationRevenue = bookedNights * adr;
  const discounts = accommodationRevenue * a.discountRate;
  const cleaningFeesCollected = turnovers * a.cleaningFeePerStay;
  const ancillaryRevenue = turnovers * a.ancillaryRevenuePerStay;
  const grossBookingRevenue =
    accommodationRevenue + cleaningFeesCollected + ancillaryRevenue - discounts;
  // Platform fee applies to platform-processed revenue; processing fees apply
  // only to directly collected ancillary revenue (no double count).
  const platformBase = accommodationRevenue - discounts + cleaningFeesCollected;
  const platformFees = a.platformFeeRate * platformBase;
  const processingFees = a.paymentProcessingRate * ancillaryRevenue;
  // Pass-through: never operator revenue, never an expense.
  const taxesCollectedPassThrough = a.occupancyTaxRate * platformBase;
  return {
    occupancyRate,
    adr,
    bookedNights,
    turnovers,
    accommodationRevenue,
    discounts,
    cleaningFeesCollected,
    ancillaryRevenue,
    grossBookingRevenue,
    platformFees,
    processingFees,
    cleaningExpense: turnovers * a.cleaningCostPerTurnover,
    laundryExpense: turnovers * a.laundryCostPerTurnover,
    suppliesExpense: turnovers * a.suppliesPerTurnover,
    taxesCollectedPassThrough,
  };
}

function variableExpenses(e: MonthEconomics): number {
  return e.cleaningExpense + e.laundryExpense + e.suppliesExpense;
}

function monthIndexFor(common: SanitizedCommon, projectionMonth: number): number {
  return calendarMonthFor(common.launchMonth, projectionMonth);
}

/** Annual OCF as a pure function of base occupancy — the break-even target. */
function annualOcfAt(
  a: ScenarioAssumptions,
  common: SanitizedCommon,
  fixed: number,
  occupancyRate: number,
): number {
  let total = 0;
  for (let p = 1; p <= 12; p += 1) {
    const cm = monthIndexFor(common, p);
    const e = monthEconomics(
      a,
      availableNights(cm, common.blockedNightsPerMonth),
      common.seasonality[cm] ?? NEUTRAL_INDEX,
      occupancyRate,
    );
    total +=
      e.grossBookingRevenue -
      e.platformFees -
      e.processingFees -
      variableExpenses(e) -
      fixed;
  }
  return total;
}

function buildAnnualTotals(monthly: MonthlyResult[]): AnnualTotals {
  const t: AnnualTotals = {
    bookedNights: 0,
    turnovers: 0,
    accommodationRevenue: 0,
    discounts: 0,
    cleaningFeesCollected: 0,
    ancillaryRevenue: 0,
    grossBookingRevenue: 0,
    platformFees: 0,
    processingFees: 0,
    cleaningExpense: 0,
    laundryExpense: 0,
    suppliesExpense: 0,
    fixedExpenses: 0,
    operatingExpenses: 0,
    operatingCashFlow: 0,
    debtPayments: 0,
    afterFinancingCashFlow: 0,
    taxesCollectedPassThrough: 0,
  };
  for (const m of monthly) {
    t.bookedNights += m.bookedNights;
    t.turnovers += m.turnovers;
    t.accommodationRevenue += m.accommodationRevenue;
    t.discounts += m.discounts;
    t.cleaningFeesCollected += m.cleaningFeesCollected;
    t.ancillaryRevenue += m.ancillaryRevenue;
    t.grossBookingRevenue += m.grossBookingRevenue;
    t.platformFees += m.platformFees;
    t.processingFees += m.processingFees;
    t.cleaningExpense += m.cleaningExpense;
    t.laundryExpense += m.laundryExpense;
    t.suppliesExpense += m.suppliesExpense;
    t.fixedExpenses += m.fixedExpenses;
    t.operatingExpenses += m.operatingExpenses;
    t.operatingCashFlow += m.operatingCashFlow;
    t.debtPayments += m.debtPayment;
    t.afterFinancingCashFlow += m.afterFinancingCashFlow;
    t.taxesCollectedPassThrough += m.taxesCollectedPassThrough;
  }
  return t;
}

export function computeScenario(
  model: UnderwritingModel,
  key: ScenarioKey,
): ScenarioResult {
  const core = sanitizeModelCore(model);
  const common = core.value;
  const warnings = new Set<FinanceWarning>(core.warnings);

  const { value: a, warnings: scenarioWarnings } = sanitizeScenario(
    model.scenarios[key],
  );
  scenarioWarnings.forEach((w) => warnings.add(w));

  const fixed = monthlyFixedExpenses(a);

  const capital = computeCapital(
    common.startup,
    fixed,
    common.reserveMonths,
    common.financing.creditFundedAmount,
  );
  capital.warnings.forEach((w) => warnings.add(w));

  const financing = computeFinancing(
    common.financing,
    capital.value.creditEligibleStartup,
  );
  financing.warnings.forEach((w) => warnings.add(w));

  const monthly: MonthlyResult[] = [];
  for (let p = 1; p <= 12; p += 1) {
    const cm = monthIndexFor(common, p);
    const e = monthEconomics(
      a,
      availableNights(cm, common.blockedNightsPerMonth),
      common.seasonality[cm] ?? NEUTRAL_INDEX,
    );
    const operatingExpenses = fixed + variableExpenses(e);
    const operatingCashFlow =
      e.grossBookingRevenue - e.platformFees - e.processingFees - operatingExpenses;
    const debtPayment = financing.schedule[p - 1]?.payment ?? 0;
    monthly.push({
      projectionMonth: p,
      calendarMonth: cm,
      availableNights: availableNights(cm, common.blockedNightsPerMonth),
      occupancyRate: e.occupancyRate,
      adr: e.adr,
      bookedNights: e.bookedNights,
      turnovers: e.turnovers,
      accommodationRevenue: e.accommodationRevenue,
      discounts: e.discounts,
      cleaningFeesCollected: e.cleaningFeesCollected,
      ancillaryRevenue: e.ancillaryRevenue,
      grossBookingRevenue: e.grossBookingRevenue,
      platformFees: e.platformFees,
      processingFees: e.processingFees,
      cleaningExpense: e.cleaningExpense,
      laundryExpense: e.laundryExpense,
      suppliesExpense: e.suppliesExpense,
      fixedExpenses: fixed,
      operatingExpenses,
      operatingCashFlow,
      debtPayment,
      afterFinancingCashFlow: operatingCashFlow - debtPayment,
      taxesCollectedPassThrough: e.taxesCollectedPassThrough,
    });
  }

  const annual = buildAnnualTotals(monthly);
  const yearOneDebtPayments = financing.schedule
    .filter((r) => r.month <= 12)
    .reduce((s, r) => s + r.payment, 0);
  const yearOneInterest = financing.schedule
    .filter((r) => r.month <= 12)
    .reduce((s, r) => s + r.interest, 0);
  const yearOneFinancingCost = financing.upfrontFee + yearOneInterest;
  const returnNumerator = annual.operatingCashFlow - yearOneFinancingCost;

  const breakEven = {
    operating: solveBreakEven((occ) => annualOcfAt(a, common, fixed, occ)),
    afterFinancing: solveBreakEven(
      (occ) => annualOcfAt(a, common, fixed, occ) - yearOneDebtPayments,
    ),
  };

  // Startup investment recovery: cumulative (OCF − interest) vs
  // nonRefundableStartup + upfrontFee; projection months repeat cyclically.
  const paybackTarget =
    capital.value.nonRefundableStartup + financing.upfrontFee;
  let paybackMonths: number | null = null;
  if (paybackTarget === 0) {
    paybackMonths = 0;
  } else {
    let cumulative = 0;
    for (let m = 1; m <= PAYBACK_HORIZON_MONTHS; m += 1) {
      cumulative +=
        (monthly[(m - 1) % 12]?.operatingCashFlow ?? 0) -
        (financing.schedule[m - 1]?.interest ?? 0);
      if (cumulative >= paybackTarget) {
        paybackMonths = m;
        break;
      }
    }
  }

  return {
    scenario: key,
    monthly,
    annual,
    monthlyAverage: {
      grossBookingRevenue: annual.grossBookingRevenue / 12,
      recurringExpenses:
        (annual.operatingExpenses +
          annual.platformFees +
          annual.processingFees) /
        12,
      operatingCashFlow: annual.operatingCashFlow / 12,
      afterFinancingCashFlow: annual.afterFinancingCashFlow / 12,
    },
    monthlyFixedExpenses: fixed,
    operatingMargin:
      annual.grossBookingRevenue > 0
        ? annual.operatingCashFlow / annual.grossBookingRevenue
        : null,
    revenueToRent:
      a.rent > 0 ? annual.grossBookingRevenue / (12 * a.rent) : null,
    capital: capital.value,
    financing,
    yearOneFinancingCost,
    breakEven,
    cashOnCash:
      capital.value.totalCommittedCapital > 0
        ? returnNumerator / capital.value.totalCommittedCapital
        : null,
    cashOnCashExReserve:
      capital.value.startupCashRequirement > 0
        ? returnNumerator / capital.value.startupCashRequirement
        : null,
    paybackMonths,
    warnings: [...warnings],
  };
}

export function computeAllScenarios(
  model: UnderwritingModel,
): Record<ScenarioKey, ScenarioResult> {
  return {
    upside: computeScenario(model, 'upside'),
    base: computeScenario(model, 'base'),
    conservative: computeScenario(model, 'conservative'),
    stress: computeScenario(model, 'stress'),
  };
}

/** Pure update: returns a new model; untouched scenarios stay reference-equal. */
export function updateScenarioField(
  model: UnderwritingModel,
  key: ScenarioKey,
  field: keyof ScenarioAssumptions,
  value: number,
): UnderwritingModel {
  return {
    ...model,
    scenarios: {
      ...model.scenarios,
      [key]: { ...model.scenarios[key], [field]: value },
    },
  };
}
