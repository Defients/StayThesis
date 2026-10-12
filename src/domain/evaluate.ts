import type {
  AcquisitionStage,
  Decision,
  EvidenceRecord,
  GateRecord,
  GateResult,
  PlanningPreferences,
  Property,
  ScenarioKey,
  ScenarioResult,
  ScoreResult,
  ScoreWeights,
  ScreeningCheck,
  UnderwritingModel,
} from './types';
import { computeAllScenarios } from './finance';
import { evaluateDecision, evaluateGates } from './compliance';
import { computeScore, computeScoreFactors, screenProperty } from './scoring';

export interface PropertyEvaluation {
  results: Record<ScenarioKey, ScenarioResult>;
  gates: GateResult[];
  score: ScoreResult;
  decision: Decision;
  screening: ScreeningCheck[];
}

/**
 * One-shot derived view for a property: scenario results, merged gates,
 * advisory score, decision classification, and screening checks. Pure — the
 * store and the dataset tests both build on this.
 */
export function evaluateProperty(input: {
  property: Property;
  model: UnderwritingModel;
  gateRecords: GateRecord[];
  evidence: EvidenceRecord[];
  stage: AcquisitionStage;
  preferences: PlanningPreferences;
  weights: ScoreWeights;
}): PropertyEvaluation {
  const results = computeAllScenarios(input.model);
  const gates = evaluateGates(input.gateRecords, results, input.preferences);
  const score = computeScore(
    computeScoreFactors({
      results,
      property: input.property,
      evidence: input.evidence,
      preferences: input.preferences,
    }),
    input.weights,
  );
  const decision = evaluateDecision({
    stage: input.stage,
    gates,
    score,
    results,
    preferences: input.preferences,
  });
  const screening = screenProperty(results, input.property, input.preferences);
  return { results, gates, score, decision, screening };
}
