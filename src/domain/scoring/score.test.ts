import { describe, expect, it } from 'vitest';
import type { EvidenceRecord } from '../types';
import {
  computeEvidenceConfidence,
  computeScore,
  DEFAULT_WEIGHTS,
  strengthMeter,
} from './score';
import { screenProperty } from './screening';
import { computeAllScenarios } from '../finance';
import { fixtureF } from '../finance/fixture';
import { DEFAULT_PREFERENCES } from '../preferences';

const factors = (v: number) => ({
  financialStrength: v,
  guestExperience: v,
  aesthetics: v,
  location: v,
  demandStability: v,
  operationalSimplicity: v,
  evidenceConfidence: v,
});

const evidence = (
  classification: EvidenceRecord['classification'],
  historyState: EvidenceRecord['historyState'],
): EvidenceRecord => ({
  id: 'e1',
  entityId: 'p1',
  metric: 'm',
  value: 0,
  units: null,
  definition: '',
  classification,
  sourceName: 's',
  sourceUrl: null,
  retrievedAt: null,
  effectiveAt: null,
  observationPeriod: null,
  reviewStatus: 'UNREVIEWED',
  reviewer: null,
  notes: '',
  historyState,
  gateCategory: null,
  audit: [],
});

describe('score (spec §4 vectors)', () => {
  it('factors all 80, default weights → total 80, band strong', () => {
    const r = computeScore(factors(80), DEFAULT_WEIGHTS);
    expect(r.total).toBeCloseTo(80, 5);
    expect(r.band).toBe('strong');
  });

  it('strength meter: 750/1500 → 75, −1500/1500 → 0 → financialStrength 45', () => {
    expect(strengthMeter(750, 1500)).toBeCloseTo(75, 5);
    expect(strengthMeter(-1500, 1500)).toBe(0);
    // financialStrength = 0.6·m(base) + 0.4·m(conservative)
    expect(0.6 * 75 + 0.4 * 0).toBeCloseTo(45, 5);
  });

  it('evidence confidence: VERIFIED + ESTIMATED/STALE + UNVERIFIED/DISPUTED (+SUPERSEDED excluded) → 41.6667', () => {
    const r = computeEvidenceConfidence([
      evidence('VERIFIED', 'CURRENT'),
      evidence('ESTIMATED', 'STALE'),
      evidence('UNVERIFIED', 'DISPUTED'),
      evidence('CALCULATED', 'SUPERSEDED'),
    ]);
    expect(r).toBeCloseTo(41.6667, 3);
  });

  it('all weights 0 → total null, band unavailable', () => {
    const zero = {
      financialStrength: 0,
      guestExperience: 0,
      aesthetics: 0,
      location: 0,
      demandStability: 0,
      operationalSimplicity: 0,
      evidenceConfidence: 0,
    };
    const r = computeScore(factors(80), zero);
    expect(r.total).toBeNull();
    expect(r.band).toBe('unavailable');
  });
});

describe('screenProperty (spec §5)', () => {
  const results = computeAllScenarios(fixtureF());
  const property = {
    monthlyRent: 1500,
  } as Parameters<typeof screenProperty>[1];

  it('returns the 8 checks in the spec order with fixture-F statuses', () => {
    const checks = screenProperty(results, property, DEFAULT_PREFERENCES);
    expect(checks.map((c) => c.id)).toEqual([
      'startup-preferred',
      'startup-max',
      'rent',
      'profit',
      'payback',
      'conservative',
      'coc',
      'rev-rent',
    ]);
    // Fixture F: startupCash 7700 vs 5000/10000; rent 1500; afterFin avg ~77.5;
    // payback 19 vs 10; cons afterFin ~77.5 ≥ −500; coc 0.2778 ≥ 0.25; r2r 2.23 ≥ 2.0.
    expect(checks.map((c) => c.status)).toEqual([
      'misses',
      'meets',
      'meets',
      'misses',
      'misses',
      'meets',
      'meets',
      'meets',
    ]);
    expect(checks[0]).toMatchObject({ actual: 7700, target: 5000, format: 'currency' });
    expect(checks[6]).toMatchObject({ format: 'percent' });
    expect(checks[7]).toMatchObject({ format: 'ratio' });
    expect(checks[4]).toMatchObject({ format: 'months' });
  });

  it('null actuals → unavailable (payback, cash-on-cash)', () => {
    // Zero revenue → payback never reached (nonzero target) → null.
    const noRevenue = computeAllScenarios(
      fixtureF({ scenario: { occupancyRate: 0 } }),
    );
    const c1 = screenProperty(noRevenue, property, DEFAULT_PREFERENCES);
    expect(c1.find((c) => c.id === 'payback')?.status).toBe('unavailable');
    expect(c1.find((c) => c.id === 'payback')?.actual).toBeNull();

    // Zero committed capital → cash-on-cash denominator 0 → null.
    const noCapital = computeAllScenarios(
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
    );
    const c2 = screenProperty(noCapital, property, DEFAULT_PREFERENCES);
    expect(c2.find((c) => c.id === 'coc')?.status).toBe('unavailable');
  });
});
