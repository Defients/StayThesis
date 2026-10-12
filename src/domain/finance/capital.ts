import type { CapitalSummary, FinanceWarning, StartupCosts } from '../types';

/**
 * Capital stack (spec §4). `monthlyFixed` is the scenario's fixed recurring
 * expenses; `creditFundedAmount` is the requested promotional-credit amount.
 * Inputs are expected to already be sanitized (see sanitize.ts).
 */
export function computeCapital(
  startup: StartupCosts,
  monthlyFixed: number,
  reserveMonths: number,
  creditFundedAmount: number,
): { value: CapitalSummary; warnings: FinanceWarning[] } {
  const warnings = new Set<FinanceWarning>();

  const creditEligibleStartup =
    startup.furnishing +
    startup.equipment +
    startup.locks +
    startup.supplies +
    startup.photography +
    startup.permitSetup +
    startup.contingency;

  // Rent, deposits and reserves must be cash — never credit-eligible.
  const nonRefundableStartup = creditEligibleStartup + startup.firstMonthRent;
  const refundableDeposit = startup.securityDeposit;
  const startupCashRequirement = nonRefundableStartup + refundableDeposit;
  const operatingReserve = reserveMonths * monthlyFixed;
  const totalCommittedCapital = startupCashRequirement + operatingReserve;

  const creditFunded = Math.min(creditFundedAmount, creditEligibleStartup);
  if (creditFundedAmount > creditEligibleStartup)
    warnings.add('credit-exceeds-eligible');

  const cashFunded = totalCommittedCapital - creditFunded;

  return {
    value: {
      nonRefundableStartup,
      creditEligibleStartup,
      refundableDeposit,
      startupCashRequirement,
      operatingReserve,
      totalCommittedCapital,
      creditFunded,
      cashFunded,
    },
    warnings: [...warnings],
  };
}
