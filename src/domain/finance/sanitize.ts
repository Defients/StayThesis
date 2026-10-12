import type {
  FinancingAssumptions,
  FinanceWarning,
  ScenarioAssumptions,
  ScenarioKey,
  SeasonalityIndex,
  StartupCosts,
  UnderwritingModel,
} from '../types';

/**
 * Input sanitation (spec §1). Non-finite → 0, negatives → 0; any change emits
 * `invalid-input-sanitized`. Specific fields carry their own rules/warnings.
 */

const NEUTRAL_INDEX: SeasonalityIndex = { occupancyIndex: 1, adrIndex: 1 };

function warn(set: Set<FinanceWarning>, w: FinanceWarning): void {
  set.add(w);
}

function nonNegative(raw: number, w: Set<FinanceWarning>): number {
  const out = !Number.isFinite(raw) ? 0 : Math.max(0, raw);
  if (out !== raw) warn(w, 'invalid-input-sanitized');
  return out;
}

function unitInterval(raw: number, w: Set<FinanceWarning>): number {
  const out = !Number.isFinite(raw) ? 0 : Math.min(1, Math.max(0, raw));
  if (out !== raw) warn(w, 'invalid-input-sanitized');
  return out;
}

export function sanitizeScenario(a: ScenarioAssumptions): {
  value: ScenarioAssumptions;
  warnings: FinanceWarning[];
} {
  const w = new Set<FinanceWarning>();
  let averageLengthOfStay = a.averageLengthOfStay;
  if (!Number.isFinite(averageLengthOfStay) || averageLengthOfStay < 1) {
    // A stay is at least one night — never divide by zero.
    averageLengthOfStay = 1;
    warn(w, 'invalid-length-of-stay');
  }
  return {
    value: {
      adr: nonNegative(a.adr, w),
      occupancyRate: unitInterval(a.occupancyRate, w),
      averageLengthOfStay,
      cleaningFeePerStay: nonNegative(a.cleaningFeePerStay, w),
      ancillaryRevenuePerStay: nonNegative(a.ancillaryRevenuePerStay, w),
      discountRate: unitInterval(a.discountRate, w),
      platformFeeRate: unitInterval(a.platformFeeRate, w),
      paymentProcessingRate: unitInterval(a.paymentProcessingRate, w),
      occupancyTaxRate: unitInterval(a.occupancyTaxRate, w),
      rent: nonNegative(a.rent, w),
      utilities: nonNegative(a.utilities, w),
      internet: nonNegative(a.internet, w),
      insurance: nonNegative(a.insurance, w),
      software: nonNegative(a.software, w),
      maintenance: nonNegative(a.maintenance, w),
      furnitureReplacement: nonNegative(a.furnitureReplacement, w),
      permitLicense: nonNegative(a.permitLicense, w),
      otherFixed: nonNegative(a.otherFixed, w),
      cleaningCostPerTurnover: nonNegative(a.cleaningCostPerTurnover, w),
      laundryCostPerTurnover: nonNegative(a.laundryCostPerTurnover, w),
      suppliesPerTurnover: nonNegative(a.suppliesPerTurnover, w),
    },
    warnings: [...w],
  };
}

export function sanitizeStartup(s: StartupCosts): {
  value: StartupCosts;
  warnings: FinanceWarning[];
} {
  const w = new Set<FinanceWarning>();
  return {
    value: {
      firstMonthRent: nonNegative(s.firstMonthRent, w),
      securityDeposit: nonNegative(s.securityDeposit, w),
      furnishing: nonNegative(s.furnishing, w),
      equipment: nonNegative(s.equipment, w),
      locks: nonNegative(s.locks, w),
      supplies: nonNegative(s.supplies, w),
      photography: nonNegative(s.photography, w),
      permitSetup: nonNegative(s.permitSetup, w),
      contingency: nonNegative(s.contingency, w),
    },
    warnings: [...w],
  };
}

export function sanitizeFinancing(f: FinancingAssumptions): {
  value: FinancingAssumptions;
  warnings: FinanceWarning[];
} {
  const w = new Set<FinanceWarning>();
  // promoMonths: integer ≥ 0. plannedRepaymentMonths: integer ≥ 1.
  const promoMonths = Number.isFinite(f.promoMonths)
    ? Math.max(0, Math.floor(f.promoMonths))
    : 0;
  if (promoMonths !== f.promoMonths) warn(w, 'invalid-input-sanitized');
  const plannedRepaymentMonths = Number.isFinite(f.plannedRepaymentMonths)
    ? Math.max(1, Math.floor(f.plannedRepaymentMonths))
    : 1;
  if (plannedRepaymentMonths !== f.plannedRepaymentMonths)
    warn(w, 'invalid-input-sanitized');
  return {
    value: {
      creditFundedAmount: nonNegative(f.creditFundedAmount, w),
      upfrontFeeRate: nonNegative(f.upfrontFeeRate, w),
      promoApr: nonNegative(f.promoApr, w),
      promoMonths,
      postPromoApr: nonNegative(f.postPromoApr, w),
      plannedRepaymentMonths,
    },
    warnings: [...w],
  };
}

export function sanitizeSeasonality(
  seasonality: SeasonalityIndex[] | undefined,
): { value: SeasonalityIndex[]; warnings: FinanceWarning[] } {
  const w = new Set<FinanceWarning>();
  const out: SeasonalityIndex[] = [];
  for (let m = 0; m < 12; m += 1) {
    const entry = seasonality?.[m];
    if (!entry) {
      out.push({ ...NEUTRAL_INDEX });
      continue;
    }
    const clean = (raw: number): number => {
      const v = !Number.isFinite(raw) ? 1 : Math.max(0, raw);
      if (v !== raw) warn(w, 'invalid-input-sanitized');
      return v;
    };
    out.push({
      occupancyIndex: clean(entry.occupancyIndex),
      adrIndex: clean(entry.adrIndex),
    });
  }
  return { value: out, warnings: [...w] };
}

function sanitizeLaunchMonth(raw: number, w: Set<FinanceWarning>): number {
  if (!Number.isFinite(raw)) {
    warn(w, 'invalid-input-sanitized');
    return 0;
  }
  const out = ((Math.floor(raw) % 12) + 12) % 12;
  if (out !== raw) warn(w, 'invalid-input-sanitized');
  return out;
}

/**
 * Sanitize every model field EXCEPT the per-scenario assumptions — callers
 * sanitize the scenario(s) they need so per-scenario warnings stay scoped.
 */
export function sanitizeModelCore(model: UnderwritingModel): {
  value: Omit<UnderwritingModel, 'scenarios'>;
  warnings: FinanceWarning[];
} {
  const w = new Set<FinanceWarning>();
  const startup = sanitizeStartup(model.startup);
  startup.warnings.forEach((x) => warn(w, x));
  const financing = sanitizeFinancing(model.financing);
  financing.warnings.forEach((x) => warn(w, x));
  const seasonality = sanitizeSeasonality(model.seasonality);
  seasonality.warnings.forEach((x) => warn(w, x));
  return {
    value: {
      propertyId: model.propertyId,
      launchMonth: sanitizeLaunchMonth(model.launchMonth, w),
      blockedNightsPerMonth: nonNegative(model.blockedNightsPerMonth, w),
      seasonality: seasonality.value,
      reserveMonths: nonNegative(model.reserveMonths, w),
      startup: startup.value,
      financing: financing.value,
    },
    warnings: [...w],
  };
}

export function sanitizeModel(model: UnderwritingModel): {
  value: UnderwritingModel;
  warnings: FinanceWarning[];
} {
  const core = sanitizeModelCore(model);
  const w = new Set<FinanceWarning>(core.warnings);
  const scenarios = {} as Record<ScenarioKey, ScenarioAssumptions>;
  (Object.keys(model.scenarios) as ScenarioKey[]).forEach((key) => {
    const s = sanitizeScenario(model.scenarios[key]);
    s.warnings.forEach((x) => warn(w, x));
    scenarios[key] = s.value;
  });
  return {
    value: { ...core.value, scenarios },
    warnings: [...w],
  };
}
