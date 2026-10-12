import { describe, expect, it } from 'vitest';
import type { ScenarioResult } from '../types';
import { computeAllScenarios, computeScenario, updateScenarioField } from './scenario';
import { fixtureF, fixtureSeasonality } from './fixture';

const MONEY = 2; // toBeCloseTo decimal places for currency
const RATIO = 5;

describe('fixture F (flat seasonality)', () => {
  const result: ScenarioResult = computeScenario(fixtureF(), 'base');

  it('computes annual totals', () => {
    expect(result.annual.bookedNights).toBeCloseTo(219, MONEY);
    expect(result.annual.turnovers).toBeCloseTo(73, MONEY);
    expect(result.annual.accommodationRevenue).toBeCloseTo(32850, MONEY);
    expect(result.annual.cleaningFeesCollected).toBeCloseTo(7300, MONEY);
    expect(result.annual.grossBookingRevenue).toBeCloseTo(40150, MONEY);
    expect(result.annual.platformFees).toBeCloseTo(1204.5, MONEY);
    expect(result.annual.cleaningExpense).toBeCloseTo(6570, MONEY);
    expect(result.annual.laundryExpense).toBeCloseTo(1460, MONEY);
    expect(result.annual.suppliesExpense).toBeCloseTo(1095, MONEY);
    expect(result.annual.fixedExpenses).toBeCloseTo(25800, MONEY);
    expect(result.annual.operatingExpenses).toBeCloseTo(34925, MONEY);
    expect(result.annual.operatingCashFlow).toBeCloseTo(4020.5, MONEY);
  });

  it('computes January', () => {
    const jan = result.monthly[0]!;
    expect(jan.bookedNights).toBeCloseTo(18.6, MONEY);
    expect(jan.grossBookingRevenue).toBeCloseTo(3410, MONEY);
    expect(jan.platformFees).toBeCloseTo(102.3, MONEY);
    expect(jan.operatingCashFlow).toBeCloseTo(382.7, MONEY);
  });

  it('computes February', () => {
    const feb = result.monthly[1]!;
    expect(feb.bookedNights).toBeCloseTo(16.8, MONEY);
    expect(feb.grossBookingRevenue).toBeCloseTo(3080, MONEY);
    expect(feb.operatingCashFlow).toBeCloseTo(137.6, MONEY);
  });

  it('computes the capital stack', () => {
    expect(result.capital.nonRefundableStartup).toBeCloseTo(6200, MONEY);
    expect(result.capital.startupCashRequirement).toBeCloseTo(7700, MONEY);
    expect(result.capital.operatingReserve).toBeCloseTo(6450, MONEY);
    expect(result.capital.totalCommittedCapital).toBeCloseTo(14150, MONEY);
    expect(result.capital.creditFunded).toBeCloseTo(3000, MONEY);
    expect(result.capital.cashFunded).toBeCloseTo(11150, MONEY);
  });

  it('computes the financing schedule', () => {
    expect(result.financing.upfrontFee).toBeCloseTo(90, MONEY);
    expect(result.financing.openingBalance).toBeCloseTo(3090, MONEY);
    expect(result.financing.scheduledPayment).toBeCloseTo(309, MONEY);
    expect(result.financing.payoffMonth).toBe(10);
    expect(result.financing.totalInterest).toBeCloseTo(0, MONEY);
    expect(result.financing.balanceAtPromoExpiry).toBeCloseTo(0, MONEY);
  });

  it('computes after-financing cash flow', () => {
    expect(result.annual.debtPayments).toBeCloseTo(3090, MONEY);
    expect(result.annual.afterFinancingCashFlow).toBeCloseTo(930.5, MONEY);
  });

  it('computes break-even occupancies', () => {
    expect(result.breakEven.operating.status).toBe('achievable');
    expect(result.breakEven.operating.occupancy).toBeCloseTo(0.519106, RATIO);
    expect(result.breakEven.afterFinancing.status).toBe('achievable');
    expect(result.breakEven.afterFinancing.occupancy).toBeCloseTo(0.581278, RATIO);
  });

  it('computes return metrics', () => {
    expect(result.cashOnCash).toBeCloseTo(0.277774, RATIO);
    expect(result.cashOnCashExReserve).toBeCloseTo(0.510455, RATIO);
    expect(result.revenueToRent).toBeCloseTo(2.230556, RATIO);
    expect(result.operatingMargin).toBeCloseTo(0.100137, RATIO);
  });

  it('computes payback', () => {
    expect(result.paybackMonths).toBe(19);
  });
});

describe('fixture F variants', () => {
  it('v1: zero bookings', () => {
    const r = computeScenario(fixtureF({ scenario: { occupancyRate: 0 } }), 'base');
    expect(r.annual.grossBookingRevenue).toBe(0);
    expect(r.annual.platformFees).toBe(0);
    expect(r.annual.operatingCashFlow).toBeCloseTo(-25800, MONEY);
    expect(r.operatingMargin).toBeNull();
    expect(r.revenueToRent).toBe(0);
    expect(r.cashOnCash).toBeCloseTo(-1.829682, RATIO);
    expect(r.paybackMonths).toBeNull();
    expect(r.breakEven.operating.status).toBe('achievable');
    expect(r.breakEven.operating.occupancy).toBeCloseTo(0.519106, RATIO);
  });

  it('v2: full occupancy', () => {
    const r = computeScenario(fixtureF({ scenario: { occupancyRate: 1 } }), 'base');
    expect(r.annual.bookedNights).toBeCloseTo(365, MONEY);
    expect(r.annual.turnovers).toBeCloseTo(121.6667, MONEY);
    expect(r.annual.grossBookingRevenue).toBeCloseTo(66916.67, MONEY);
    expect(r.annual.platformFees).toBeCloseTo(2007.5, MONEY);
    expect(r.annual.operatingExpenses).toBeCloseTo(41008.33, MONEY);
    expect(r.annual.operatingCashFlow).toBeCloseTo(23900.83, MONEY);
  });

  it('v3: revenue below rent', () => {
    const r = computeScenario(
      fixtureF({ scenario: { occupancyRate: 0.2, rent: 4000 } }),
      'base',
    );
    expect(r.annual.grossBookingRevenue).toBeCloseTo(13383.33, MONEY);
    expect(r.revenueToRent).toBeCloseTo(0.278819, RATIO);
    expect(r.annual.operatingCashFlow).toBeLessThan(0);
    expect(r.breakEven.operating).toEqual({
      occupancy: null,
      status: 'not-achievable',
    });
  });

  it('v4: seasonality', () => {
    const seasonality = fixtureSeasonality();
    seasonality[0] = { occupancyIndex: 0.5, adrIndex: 1 }; // January
    seasonality[6] = { occupancyIndex: 1.5, adrIndex: 1.2 }; // July
    const r = computeScenario(fixtureF({ seasonality }), 'base');
    const jan = r.monthly[0]!;
    const jul = r.monthly[6]!;
    expect(jan.operatingCashFlow).toBeCloseTo(-883.65, MONEY);
    expect(jul.occupancyRate).toBeCloseTo(0.9, RATIO);
    expect(jul.adr).toBeCloseTo(180, MONEY);
    expect(jul.grossBookingRevenue).toBeCloseTo(5952, MONEY);
    expect(jul.platformFees).toBeCloseTo(178.56, MONEY);
    expect(jul.operatingCashFlow).toBeCloseTo(2460.94, MONEY);
    expect(r.annual.operatingCashFlow).toBeCloseTo(4832.39, MONEY);
  });

  it('v5: occupancy clamps at 1.0', () => {
    const seasonality = fixtureSeasonality();
    seasonality[2] = { occupancyIndex: 1.5, adrIndex: 1 }; // March
    const r = computeScenario(
      fixtureF({ seasonality, scenario: { occupancyRate: 0.8 } }),
      'base',
    );
    expect(r.monthly[2]!.occupancyRate).toBe(1);
  });

  it('v6: taxes are pass-through', () => {
    const r = computeScenario(
      fixtureF({ scenario: { occupancyTaxRate: 0.1 } }),
      'base',
    );
    expect(r.annual.taxesCollectedPassThrough).toBeCloseTo(4015, MONEY);
    expect(r.annual.grossBookingRevenue).toBeCloseTo(40150, MONEY);
    expect(r.annual.operatingCashFlow).toBeCloseTo(4020.5, MONEY);
  });

  it('v7: discounts reduce platform base', () => {
    const r = computeScenario(
      fixtureF({ scenario: { discountRate: 0.1 } }),
      'base',
    );
    expect(r.annual.discounts).toBeCloseTo(3285, MONEY);
    expect(r.annual.grossBookingRevenue).toBeCloseTo(36865, MONEY);
    expect(r.annual.platformFees).toBeCloseTo(1105.95, MONEY);
  });

  it('v8: ancillary + processing, no platform double count', () => {
    const r = computeScenario(
      fixtureF({
        scenario: { ancillaryRevenuePerStay: 30, paymentProcessingRate: 0.03 },
      }),
      'base',
    );
    expect(r.annual.ancillaryRevenue).toBeCloseTo(2190, MONEY);
    expect(r.annual.processingFees).toBeCloseTo(65.7, MONEY);
    expect(r.annual.platformFees).toBeCloseTo(1204.5, MONEY);
  });

  it('v9: deposit is refundable cash, not P&L', () => {
    const r = computeScenario(
      fixtureF({ startup: { securityDeposit: 2500 } }),
      'base',
    );
    expect(r.capital.nonRefundableStartup).toBeCloseTo(6200, MONEY);
    expect(r.capital.startupCashRequirement).toBeCloseTo(8700, MONEY);
    expect(r.capital.totalCommittedCapital).toBeCloseTo(15150, MONEY);
    expect(r.annual.operatingExpenses).toBeCloseTo(34925, MONEY);
    expect(r.annual.operatingCashFlow).toBeCloseTo(4020.5, MONEY);
    expect(r.paybackMonths).toBe(19);
  });

  it('v10: zero reserve months', () => {
    const r = computeScenario(fixtureF({ reserveMonths: 0 }), 'base');
    expect(r.capital.operatingReserve).toBe(0);
    expect(r.capital.totalCommittedCapital).toBeCloseTo(7700, MONEY);
    expect(r.annual.operatingExpenses).toBeCloseTo(34925, MONEY);
  });

  it('v11: credit capped at eligible startup costs', () => {
    const r = computeScenario(
      fixtureF({ financing: { creditFundedAmount: 6000 } }),
      'base',
    );
    expect(r.capital.creditFunded).toBeCloseTo(4700, MONEY);
    expect(r.warnings).toContain('credit-exceeds-eligible');
  });
});

describe('v12: invalid inputs and denominators', () => {
  it('rent 0 → revenueToRent null', () => {
    const r = computeScenario(fixtureF({ scenario: { rent: 0 } }), 'base');
    expect(r.revenueToRent).toBeNull();
  });

  it('ALOS 0 → treated as 1 with invalid-length-of-stay', () => {
    const r = computeScenario(
      fixtureF({ scenario: { averageLengthOfStay: 0 } }),
      'base',
    );
    expect(r.warnings).toContain('invalid-length-of-stay');
    expect(r.annual.turnovers).toBeCloseTo(219, MONEY); // bookedNights / 1
  });

  it('NaN adr → 0 with invalid-input-sanitized', () => {
    const r = computeScenario(fixtureF({ scenario: { adr: NaN } }), 'base');
    expect(r.warnings).toContain('invalid-input-sanitized');
    expect(r.annual.accommodationRevenue).toBe(0);
  });

  it('all startup 0 + reserve 0 → cashOnCash null', () => {
    const r = computeScenario(
      fixtureF({
        startup: {
          firstMonthRent: 0,
          securityDeposit: 0,
          furnishing: 0,
          equipment: 0,
          locks: 0,
          supplies: 0,
          photography: 0,
          permitSetup: 0,
          contingency: 0,
        },
        financing: { creditFundedAmount: 0 },
        reserveMonths: 0,
      }),
      'base',
    );
    expect(r.cashOnCash).toBeNull();
    expect(r.cashOnCashExReserve).toBeNull();
  });
});

describe('scenario independence', () => {
  it('updateScenarioField returns a new model and leaves other scenarios reference-equal', () => {
    const model = fixtureF();
    const updated = updateScenarioField(model, 'base', 'adr', 200);
    expect(updated).not.toBe(model);
    expect(updated.scenarios.base).not.toBe(model.scenarios.base);
    expect(updated.scenarios.base.adr).toBe(200);
    expect(updated.scenarios.upside).toBe(model.scenarios.upside);
    expect(updated.scenarios.conservative).toBe(model.scenarios.conservative);
    expect(updated.scenarios.stress).toBe(model.scenarios.stress);
    // Original model untouched.
    expect(model.scenarios.base.adr).toBe(150);
  });

  it('computeAllScenarios returns four results; only the edited scenario changes', () => {
    const model = fixtureF();
    const before = computeAllScenarios(model);
    const updated = updateScenarioField(model, 'base', 'adr', 200);
    const after = computeAllScenarios(updated);
    expect(Object.keys(after).sort()).toEqual([
      'base',
      'conservative',
      'stress',
      'upside',
    ]);
    expect(after.base.annual.grossBookingRevenue).not.toBeCloseTo(
      before.base.annual.grossBookingRevenue,
      MONEY,
    );
    for (const key of ['upside', 'conservative', 'stress'] as const) {
      expect(after[key].annual.grossBookingRevenue).toBeCloseTo(
        before[key].annual.grossBookingRevenue,
        MONEY,
      );
      expect(after[key].annual.operatingCashFlow).toBeCloseTo(
        before[key].annual.operatingCashFlow,
        MONEY,
      );
    }
  });
});
