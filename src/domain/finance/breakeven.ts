import type { BreakEvenResult } from '../types';

const BISECTION_ITERATIONS = 80;

/**
 * Break-even occupancy (spec §6): solve `f(occupancy) = 0` on [0, 1] by
 * bisection over the real annual function (same seasonality and clamping).
 *
 * - f(0) ≥ 0 → `{ occupancy: 0, status: 'always' }`
 * - f(1) < 0 → `{ occupancy: null, status: 'not-achievable' }`
 */
export function solveBreakEven(f: (occupancyRate: number) => number): BreakEvenResult {
  if (f(0) >= 0) return { occupancy: 0, status: 'always' };
  if (f(1) < 0) return { occupancy: null, status: 'not-achievable' };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return { occupancy: hi, status: 'achievable' };
}
