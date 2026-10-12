import type { PlanningPreferences } from './types';

/**
 * Editable planning defaults (spec §1). Advisory — these are the team's
 * planning preferences, not objective thresholds.
 */
export const DEFAULT_PREFERENCES: PlanningPreferences = {
  preferredStartupExposure: 5000,
  maxStartupExposure: 10000,
  reserveMonths: 3,
  maxMonthlyRent: 3000,
  targetMonthlyProfit: 1500,
  preferredPaybackMonths: 10,
  tempLossTolerancePerMonth: 500,
  tempLossToleranceMonths: 3,
  targetCashOnCash: 0.25,
  targetRevenueToRent: 2.0,
  midTermFallbackDays: { min: 30, max: 90 },
};
