import type {
  PlanningPreferences,
  Property,
  ScenarioKey,
  ScenarioResult,
  ScreeningCheck,
} from '../types';

const check = (
  id: string,
  label: string,
  actual: number | null,
  target: number,
  format: ScreeningCheck['format'],
  meets: (actual: number) => boolean,
): ScreeningCheck => ({
  id,
  label,
  status: actual === null ? 'unavailable' : meets(actual) ? 'meets' : 'misses',
  actual,
  target,
  format,
});

/**
 * Advisory screening (spec §5) — independent of the hard gates, shown in a
 * fixed order. Null inputs yield `unavailable`, never a pass or fail.
 */
export function screenProperty(
  results: Record<ScenarioKey, ScenarioResult>,
  property: Property,
  preferences: PlanningPreferences,
): ScreeningCheck[] {
  const base = results.base;
  const conservative = results.conservative;
  const startupCash = base.capital.startupCashRequirement;

  return [
    check(
      'startup-preferred',
      'Startup cash vs preferred',
      startupCash,
      preferences.preferredStartupExposure,
      'currency',
      (a) => a <= preferences.preferredStartupExposure,
    ),
    check(
      'startup-max',
      'Startup cash vs flexible max',
      startupCash,
      preferences.maxStartupExposure,
      'currency',
      (a) => a <= preferences.maxStartupExposure,
    ),
    check(
      'rent',
      'Monthly rent',
      property.monthlyRent,
      preferences.maxMonthlyRent,
      'currency',
      (a) => a <= preferences.maxMonthlyRent,
    ),
    check(
      'profit',
      'Base after-financing profit / mo',
      base.monthlyAverage.afterFinancingCashFlow,
      preferences.targetMonthlyProfit,
      'currency',
      (a) => a >= preferences.targetMonthlyProfit,
    ),
    check(
      'payback',
      'Base startup payback',
      base.paybackMonths,
      preferences.preferredPaybackMonths,
      'months',
      (a) => a <= preferences.preferredPaybackMonths,
    ),
    check(
      'conservative',
      'Conservative after-financing / mo',
      conservative.monthlyAverage.afterFinancingCashFlow,
      -preferences.tempLossTolerancePerMonth,
      'currency',
      (a) => a >= -preferences.tempLossTolerancePerMonth,
    ),
    check(
      'coc',
      'Base cash-on-cash',
      base.cashOnCash,
      preferences.targetCashOnCash,
      'percent',
      (a) => a >= preferences.targetCashOnCash,
    ),
    check(
      'rev-rent',
      'Base revenue-to-rent',
      base.revenueToRent,
      preferences.targetRevenueToRent,
      'ratio',
      (a) => a >= preferences.targetRevenueToRent,
    ),
  ];
}
