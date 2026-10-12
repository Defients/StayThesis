import type {
  EvidenceRecord,
  PlanningPreferences,
  Property,
  ScenarioKey,
  ScenarioResult,
  ScoreFactor,
  ScoreResult,
  ScoreWeights,
} from '../types';
import { DEFAULT_PREFERENCES } from '../preferences';

/** Advisory score weights (spec §4). */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  financialStrength: 30,
  guestExperience: 15,
  aesthetics: 10,
  location: 15,
  demandStability: 15,
  operationalSimplicity: 5,
  evidenceConfidence: 10,
};

const clamp100 = (x: number) => Math.min(100, Math.max(0, x));

/** m(x) = clamp(50 + 50·x/target, 0, 100); target ≤ 0 falls back to 1500. */
export function strengthMeter(x: number, target: number): number {
  const t = target > 0 ? target : 1500;
  return clamp100(50 + (50 * x) / t);
}

const CLASSIFICATION_WEIGHT: Record<string, number> = {
  VERIFIED: 1.0,
  CALCULATED: 0.8,
  ESTIMATED: 0.5,
  OPERATOR_CLAIM: 0.35,
  UNVERIFIED: 0.15,
};

/**
 * Evidence confidence (spec §4): mean per-record weight over the property's
 * evidence excluding SUPERSEDED; STALE halves, DISPUTED/INCORRECT zero.
 * No usable evidence → 0.
 */
export function computeEvidenceConfidence(evidence: EvidenceRecord[]): number {
  const usable = evidence.filter((e) => e.historyState !== 'SUPERSEDED');
  if (usable.length === 0) return 0;
  const sum = usable.reduce((acc, e) => {
    let w = CLASSIFICATION_WEIGHT[e.classification] ?? 0;
    if (e.historyState === 'STALE') w *= 0.5;
    if (e.historyState === 'DISPUTED' || e.historyState === 'INCORRECT') w = 0;
    return acc + w;
  }, 0);
  return (100 * sum) / usable.length;
}

export interface ScoreInputs {
  results: Record<ScenarioKey, ScenarioResult>;
  property: Property;
  evidence: EvidenceRecord[];
  preferences?: PlanningPreferences;
}

/** The seven factor values feeding the weighted score. */
export function computeScoreFactors({
  results,
  property,
  evidence,
  preferences = DEFAULT_PREFERENCES,
}: ScoreInputs): Record<ScoreFactor, number> {
  const target = preferences.targetMonthlyProfit;
  const financialStrength =
    0.6 *
      strengthMeter(results.base.monthlyAverage.afterFinancingCashFlow, target) +
    0.4 *
      strengthMeter(
        results.conservative.monthlyAverage.operatingCashFlow,
        target,
      );
  return {
    financialStrength,
    guestExperience: property.ratings.guestExperience,
    aesthetics: property.ratings.aesthetics,
    location: property.ratings.location,
    demandStability: property.ratings.demandStability,
    operationalSimplicity: property.ratings.operationalSimplicity,
    evidenceConfidence: computeEvidenceConfidence(evidence),
  };
}

function bandFor(total: number | null): ScoreResult['band'] {
  if (total === null) return 'unavailable';
  if (total >= 75) return 'strong';
  if (total >= 60) return 'promising';
  if (total >= 45) return 'weak';
  return 'poor';
}

/** Weighted total (spec §4): Σ(w·factor)/Σw — null when Σw = 0. */
export function computeScore(
  factors: Record<ScoreFactor, number>,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  const keys = Object.keys(weights) as ScoreFactor[];
  const weightSum = keys.reduce((s, k) => s + weights[k], 0);
  const total =
    weightSum === 0
      ? null
      : keys.reduce((s, k) => s + weights[k] * factors[k], 0) / weightSum;
  return { total, factors, band: bandFor(total) };
}
