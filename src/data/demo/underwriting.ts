import type {
  FinancingAssumptions,
  Market,
  Property,
  ScenarioAssumptions,
  StartupCosts,
  UnderwritingModel,
} from '@/domain/types';

/**
 * Deterministic pseudo-random in [0, 1) keyed on a string — lets the seed pick
 * stable values inside spec'd ranges without Math.random.
 */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const j = (property: Property, salt: string, min: number, span: number): number =>
  min + hash01(`${property.id}:${salt}`) * span;

const round = (n: number): number => Math.round(n);

export interface UnderwritingSeedOverrides {
  /** Multiplies market ADR for the base scenario (property premium). */
  adrPremium?: number;
  /** Overrides market occupancy for the base scenario. */
  baseOccupancy?: number;
  base?: Partial<ScenarioAssumptions>;
  upside?: Partial<ScenarioAssumptions>;
  conservative?: Partial<ScenarioAssumptions>;
  stress?: Partial<ScenarioAssumptions>;
  startup?: Partial<StartupCosts>;
  financing?: Partial<FinancingAssumptions>;
  launchMonth?: number;
  blockedNightsPerMonth?: number;
  reserveMonths?: number;
}

function baseAssumptions(property: Property, market: Market, o: UnderwritingSeedOverrides): ScenarioAssumptions {
  const cleaningFee = Math.round(j(property, 'fee', 95, 25));
  return {
    adr: market.metrics.adr * (o.adrPremium ?? 1),
    occupancyRate: o.baseOccupancy ?? market.metrics.occupancyRate,
    averageLengthOfStay: 2.8,
    cleaningFeePerStay: cleaningFee,
    ancillaryRevenuePerStay: 8,
    discountRate: 0.05,
    // Host-only fee model: the platform keeps ~15.5% of booking revenue; ADR is the guest-facing nightly price.
    platformFeeRate: 0.155,
    paymentProcessingRate: 0.029,
    occupancyTaxRate: 0.1,
    rent: property.monthlyRent,
    utilities: Math.round(j(property, 'util', 220, 100)),
    internet: 70,
    insurance: Math.round(j(property, 'ins', 85, 35)),
    software: 45,
    maintenance: Math.round(j(property, 'maint', 100, 50)),
    furnitureReplacement: Math.round(j(property, 'furn', 60, 40)),
    permitLicense: 25,
    otherFixed: 30,
    cleaningCostPerTurnover: Math.round(j(property, 'clean', 85, 25)),
    laundryCostPerTurnover: Math.round(j(property, 'laundry', 18, 7)),
    suppliesPerTurnover: Math.round(j(property, 'supplies', 12, 3)),
    ...o.base,
  };
}

function scenarioVariant(
  base: ScenarioAssumptions,
  delta: { adrMul: number; occDelta: number; cleaningMul?: number },
): ScenarioAssumptions {
  return {
    ...base,
    adr: base.adr * delta.adrMul,
    occupancyRate: Math.max(0, base.occupancyRate + delta.occDelta),
    cleaningCostPerTurnover:
      base.cleaningCostPerTurnover * (delta.cleaningMul ?? 1),
  };
}

function startupCosts(property: Property, o: UnderwritingSeedOverrides): StartupCosts {
  const furnishing =
    o.startup?.furnishing ??
    (property.furnishing === 'furnished'
      ? Math.round(j(property, 'startup-furn', 600, 600))
      : property.furnishing === 'partially-furnished'
        ? 3000
        : Math.round(j(property, 'startup-furn', 6500, 2500)));

  const raw: Omit<StartupCosts, 'contingency'> = {
    firstMonthRent: property.monthlyRent,
    securityDeposit: property.monthlyRent,
    furnishing,
    equipment: 400,
    locks: 250,
    supplies: 350,
    photography: 250,
    permitSetup: Math.round(j(property, 'permit', 150, 150)),
  };
  // Contingency ≈ 10% of the other startup expenses (rent/deposit excluded).
  const contingency = round(
    0.1 *
      (raw.furnishing +
        raw.equipment +
        raw.locks +
        raw.supplies +
        raw.photography +
        raw.permitSetup),
  );
  return { ...raw, contingency, ...o.startup };
}

/**
 * Deterministic seed underwriting for a property in its market. Defaults are
 * the Phase-1 acquisition assumptions; `overrides` tunes specific seeds so the
 * demo archetypes hold under the real engine.
 */
export function buildSeedUnderwriting(
  property: Property,
  market: Market,
  overrides: UnderwritingSeedOverrides = {},
): UnderwritingModel {
  const base = baseAssumptions(property, market, overrides);
  const startup = startupCosts(property, overrides);
  // Credit-eligible = furnishing+equipment+locks+supplies+photography+permit
  // setup+contingency (rent, deposit and reserve are cash-only). Seeds never
  // request more than eligible, rounded down to the nearest $100.
  const creditEligible =
    startup.furnishing +
    startup.equipment +
    startup.locks +
    startup.supplies +
    startup.photography +
    startup.permitSetup +
    startup.contingency;
  return {
    propertyId: property.id,
    launchMonth: overrides.launchMonth ?? 2,
    blockedNightsPerMonth: overrides.blockedNightsPerMonth ?? 0,
    seasonality: market.seasonality.map((s) => ({ ...s })),
    reserveMonths: overrides.reserveMonths ?? 3,
    startup,
    financing: {
      creditFundedAmount: Math.min(2500, Math.floor(creditEligible / 100) * 100),
      upfrontFeeRate: 0.03,
      promoApr: 0,
      promoMonths: 12,
      postPromoApr: 0.2499,
      plannedRepaymentMonths: 10,
      ...overrides.financing,
    },
    scenarios: {
      base: { ...base, ...overrides.base },
      upside: {
        ...scenarioVariant(base, { adrMul: 1.08, occDelta: 0.05 }),
        ...overrides.upside,
      },
      conservative: {
        ...scenarioVariant(base, { adrMul: 0.9, occDelta: -0.1 }),
        ...overrides.conservative,
      },
      stress: {
        ...scenarioVariant(base, {
          adrMul: 0.8,
          occDelta: -0.2,
          cleaningMul: 1.1,
        }),
        ...overrides.stress,
      },
    },
  };
}
