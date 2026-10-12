import type {
  FinancingAssumptions,
  FinancingResult,
  FinancingScheduleRow,
  FinanceWarning,
} from '../types';
import { sanitizeFinancing } from './sanitize';

const MAX_SCHEDULE_MONTHS = 120;
const BALANCE_EPSILON = 1e-9;
const PROMO_REMAINING_EPSILON = 0.005;

/**
 * Promotional-credit amortization (spec §5).
 *
 * Fixed scheduled payment = opening balance / plannedRepaymentMonths; each
 * month accrues `balance × apr / 12` on the opening balance, then applies
 * min(scheduledPayment, balance + interest).
 */
export function computeFinancing(
  financing: FinancingAssumptions,
  creditEligibleStartup: number,
): FinancingResult {
  const { value: f, warnings: w } = sanitizeFinancing(financing);
  const warnings = new Set<FinanceWarning>(w);

  const eligible = Number.isFinite(creditEligibleStartup)
    ? Math.max(0, creditEligibleStartup)
    : 0;
  const creditFunded = Math.min(f.creditFundedAmount, eligible);
  if (f.creditFundedAmount > eligible) warnings.add('credit-exceeds-eligible');

  const upfrontFee = creditFunded * f.upfrontFeeRate;
  const openingBalance = creditFunded + upfrontFee;
  const scheduledPayment = openingBalance / f.plannedRepaymentMonths;

  const schedule: FinancingScheduleRow[] = [];
  let balance = openingBalance;
  let totalInterest = 0;
  let postPromoInterest = 0;
  let balanceAtPromoExpiry: number | null = f.promoMonths === 0 ? openingBalance : null;

  for (
    let m = 1;
    m <= MAX_SCHEDULE_MONTHS && balance > BALANCE_EPSILON;
    m += 1
  ) {
    const promotional = m <= f.promoMonths;
    const apr = promotional ? f.promoApr : f.postPromoApr;
    const interest = (balance * apr) / 12;
    const payment = Math.min(scheduledPayment, balance + interest);
    const closing = balance + interest - payment;
    schedule.push({
      month: m,
      openingBalance: balance,
      apr,
      interest,
      payment,
      closingBalance: closing,
      promotional,
    });
    totalInterest += interest;
    if (!promotional) postPromoInterest += interest;
    balance = closing;
    if (m === f.promoMonths) balanceAtPromoExpiry = closing;
  }

  // Loan paid off before (or the schedule ended before) promo expiry.
  if (balanceAtPromoExpiry === null) balanceAtPromoExpiry = Math.max(0, balance);
  if (balanceAtPromoExpiry > PROMO_REMAINING_EPSILON)
    warnings.add('promo-balance-remaining');

  let payoffMonth: number | null;
  if (openingBalance === 0) {
    payoffMonth = 0;
  } else if (balance > BALANCE_EPSILON) {
    payoffMonth = null;
    warnings.add('payoff-not-reached');
  } else {
    payoffMonth = schedule[schedule.length - 1]?.month ?? 0;
  }

  const requiredMonthlyToClearByPromo =
    f.promoMonths > 0 && openingBalance > 0
      ? openingBalance / f.promoMonths
      : null;

  return {
    creditFunded,
    upfrontFee,
    openingBalance,
    scheduledPayment,
    requiredMonthlyToClearByPromo,
    balanceAtPromoExpiry,
    totalInterest,
    postPromoInterest,
    payoffMonth,
    schedule,
    warnings: [...warnings],
  };
}
