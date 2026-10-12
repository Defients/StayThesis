import { describe, expect, it } from 'vitest';
import { computeFinancing } from './financing';
import { fixtureFinancing } from './fixture';

const MONEY = 2;
const PRECISE = 6;

/**
 * Spec §7 vector G: credit 6000, fee 0, promoApr 0, promoMonths 6,
 * postPromoApr 0.24, planned 12 → scheduledPayment 500; promo ends with a
 * balance remaining.
 */
describe('financing vector G (promo ends with balance remaining)', () => {
  const r = computeFinancing(
    fixtureFinancing({
      creditFundedAmount: 6000,
      upfrontFeeRate: 0,
      promoApr: 0,
      promoMonths: 6,
      postPromoApr: 0.24,
      plannedRepaymentMonths: 12,
    }),
    6000, // creditEligibleStartup ≥ requested
  );

  it('computes the schedule rows', () => {
    expect(r.scheduledPayment).toBeCloseTo(500, MONEY);
    const at = (m: number) => r.schedule[m - 1]!;
    expect(at(6).interest).toBeCloseTo(0, MONEY);
    expect(at(6).closingBalance).toBeCloseTo(3000, MONEY);
    expect(at(7).interest).toBeCloseTo(60, MONEY);
    expect(at(7).closingBalance).toBeCloseTo(2560, MONEY);
    expect(at(8).interest).toBeCloseTo(51.2, MONEY);
    expect(at(8).closingBalance).toBeCloseTo(2111.2, MONEY);
    expect(at(12).interest).toBeCloseTo(14.204447, PRECISE);
    expect(at(12).closingBalance).toBeCloseTo(224.426776, PRECISE);
    expect(at(13).interest).toBeCloseTo(4.488536, PRECISE);
    expect(at(13).payment).toBeCloseTo(228.915312, PRECISE);
    expect(at(13).closingBalance).toBeCloseTo(0, PRECISE);
    expect(r.schedule).toHaveLength(13);
  });

  it('computes summary fields and warnings', () => {
    expect(r.balanceAtPromoExpiry).toBeCloseTo(3000, MONEY);
    expect(r.warnings).toContain('promo-balance-remaining');
    expect(r.requiredMonthlyToClearByPromo).toBeCloseTo(1000, MONEY);
    expect(r.postPromoInterest).toBeCloseTo(228.915312, PRECISE);
    expect(r.totalInterest).toBeCloseTo(228.915312, PRECISE);
    expect(r.payoffMonth).toBe(13);
  });

  it('year-1 interest is the sum of months 1..12', () => {
    const yearOneInterest = r.schedule
      .filter((row) => row.month <= 12)
      .reduce((s, row) => s + row.interest, 0);
    expect(yearOneInterest).toBeCloseTo(224.426776, PRECISE);
  });
});
