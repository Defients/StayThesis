import type {
  AcquisitionStage,
  Decision,
  DecisionClass,
  GateResult,
  PlanningPreferences,
  ScenarioKey,
  ScenarioResult,
  ScoreResult,
} from '../types';
import { gateLabel } from './gates';

export const DECISION_HEADLINES: Record<DecisionClass, string> = {
  QUALIFIED: 'Meets every critical gate — eligible for acquisition approval',
  RESEARCH_CANDIDATE: 'Promising — unresolved gates keep it in research',
  HOLD_UNRESOLVED: 'On hold — unresolved critical gates block final qualification',
  BLOCKED: 'Blocked by a failed critical gate',
  REJECTED: 'Rejected by the team',
};

const FINAL_STAGES: readonly AcquisitionStage[] = ['final-audit', 'qualified'];

export interface EvaluateDecisionInput {
  stage: AcquisitionStage;
  gates: GateResult[];
  score: ScoreResult;
  results: Record<ScenarioKey, ScenarioResult>;
  preferences: PlanningPreferences;
}

/**
 * Decision classification (spec §3). The advisory score never changes the
 * classification — only gates and stage do.
 */
export function evaluateDecision({
  stage,
  gates,
  score,
  results,
  preferences,
}: EvaluateDecisionInput): Decision {
  const failed = gates
    .filter((g) => g.status === 'FAIL')
    .map((g) => g.category);
  const unresolved = gates
    .filter((g) => g.status === 'NEEDS_VERIFICATION')
    .map((g) => g.category);

  let classification: DecisionClass;
  if (stage === 'rejected') classification = 'REJECTED';
  else if (failed.length > 0) classification = 'BLOCKED';
  else if (unresolved.length > 0)
    classification = FINAL_STAGES.includes(stage)
      ? 'HOLD_UNRESOLVED'
      : 'RESEARCH_CANDIDATE';
  else classification = 'QUALIFIED';

  const canQualify =
    stage !== 'rejected' && failed.length === 0 && unresolved.length === 0;

  const risks: string[] = [
    ...failed.map((c) => `${gateLabel(c)} — failed`),
    ...unresolved.map((c) => `${gateLabel(c)} — unverified`),
  ];
  const conservative = results.conservative;
  if (conservative.annual.operatingCashFlow < 0)
    risks.push('Conservative-case annual operating cash flow is negative');
  if (results.base.financing.warnings.includes('promo-balance-remaining'))
    risks.push('Promotional credit balance remains when the promo expires');
  if (
    results.base.capital.startupCashRequirement >
    preferences.preferredStartupExposure
  )
    risks.push('Startup cash requirement exceeds preferred exposure');
  const revenueToRent = results.base.revenueToRent;
  if (revenueToRent !== null && revenueToRent < preferences.targetRevenueToRent)
    risks.push('Base revenue-to-rent is below the planning target');

  return {
    classification,
    canQualify,
    failed,
    unresolved,
    score,
    headline: DECISION_HEADLINES[classification],
    risks,
  };
}
