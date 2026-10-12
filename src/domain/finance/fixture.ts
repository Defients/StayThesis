import type {
  FinancingAssumptions,
  ScenarioAssumptions,
  SeasonalityIndex,
  StartupCosts,
  UnderwritingModel,
} from '../types';

/**
 * Spec §7 fixture F: flat seasonality, launchMonth 0, no blocked nights,
 * 3 reserve months. All four scenarios share the same assumptions.
 */

export function fixtureSeasonality(): SeasonalityIndex[] {
  return Array.from({ length: 12 }, () => ({
    occupancyIndex: 1,
    adrIndex: 1,
  }));
}

export function fixtureScenario(
  overrides: Partial<ScenarioAssumptions> = {},
): ScenarioAssumptions {
  return {
    adr: 150,
    occupancyRate: 0.6,
    averageLengthOfStay: 3,
    cleaningFeePerStay: 100,
    ancillaryRevenuePerStay: 0,
    discountRate: 0,
    platformFeeRate: 0.03,
    paymentProcessingRate: 0,
    occupancyTaxRate: 0,
    rent: 1500,
    utilities: 250,
    internet: 70,
    insurance: 80,
    software: 50,
    maintenance: 100,
    furnitureReplacement: 75,
    permitLicense: 25,
    otherFixed: 0,
    cleaningCostPerTurnover: 90,
    laundryCostPerTurnover: 20,
    suppliesPerTurnover: 15,
    ...overrides,
  };
}

export function fixtureStartup(
  overrides: Partial<StartupCosts> = {},
): StartupCosts {
  return {
    firstMonthRent: 1500,
    securityDeposit: 1500,
    furnishing: 3000,
    equipment: 400,
    locks: 250,
    supplies: 300,
    photography: 250,
    permitSetup: 200,
    contingency: 300,
    ...overrides,
  };
}

export function fixtureFinancing(
  overrides: Partial<FinancingAssumptions> = {},
): FinancingAssumptions {
  return {
    creditFundedAmount: 3000,
    upfrontFeeRate: 0.03,
    promoApr: 0,
    promoMonths: 12,
    postPromoApr: 0.24,
    plannedRepaymentMonths: 10,
    ...overrides,
  };
}

export interface FixtureOverrides {
  scenario?: Partial<ScenarioAssumptions>;
  startup?: Partial<StartupCosts>;
  financing?: Partial<FinancingAssumptions>;
  launchMonth?: number;
  blockedNightsPerMonth?: number;
  reserveMonths?: number;
  seasonality?: SeasonalityIndex[];
}

export function fixtureF(overrides: FixtureOverrides = {}): UnderwritingModel {
  const scenario = fixtureScenario(overrides.scenario);
  return {
    propertyId: 'prop-fixture-f',
    launchMonth: overrides.launchMonth ?? 0,
    blockedNightsPerMonth: overrides.blockedNightsPerMonth ?? 0,
    seasonality: overrides.seasonality ?? fixtureSeasonality(),
    reserveMonths: overrides.reserveMonths ?? 3,
    startup: fixtureStartup(overrides.startup),
    financing: fixtureFinancing(overrides.financing),
    scenarios: {
      upside: { ...scenario },
      base: { ...scenario },
      conservative: { ...scenario },
      stress: { ...scenario },
    },
  };
}
