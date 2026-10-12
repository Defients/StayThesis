import { useMemo } from 'react';
import type {
  ApprovalRequest,
  Decision,
  EvidenceRecord,
  GateResult,
  Market,
  PipelineRecord,
  Property,
  PropertyId,
  ScoreResult,
  ScenarioKey,
  ScenarioResult,
  ScreeningCheck,
  Task,
  UnderwritingModel,
} from '@/domain/types';
import { evaluateProperty, type PropertyEvaluation } from '@/domain/evaluate';
import { marketById } from '@/data/demo/markets';
import { propertyById } from '@/data/demo/properties';
import { useStore } from './StoreContext';
import type { DemoState } from './state';

/**
 * CALCULATED evidence records never display stored numbers — the value shown
 * is derived live from the current underwriting results so engine-linked
 * records always match the model.
 */
const LIVE_EVIDENCE_METRICS: Record<
  string,
  (results: Record<ScenarioKey, ScenarioResult>) => number
> = {
  projectedRevenue: (r) => r.base.annual.grossBookingRevenue,
};

export interface PropertyView extends PropertyEvaluation {
  property: Property;
  market: Market | null;
  pipeline: PipelineRecord;
  model: UnderwritingModel;
  results: Record<ScenarioKey, ScenarioResult>;
  gates: GateResult[];
  decision: Decision;
  score: ScoreResult;
  screening: ScreeningCheck[];
  evidence: EvidenceRecord[];
  tasks: Task[];
  approvals: ApprovalRequest[];
  /** Stage `qualified` AND every approval for the property is APPROVED×2. */
  readyToAcquire: boolean;
}

// Derived views are memoized per state object — the reducer produces a new
// state identity on every action, so stale results can never be served.
const viewCache = new WeakMap<DemoState, Map<PropertyId, PropertyView | null>>();

export function selectPropertyView(
  state: DemoState,
  propertyId: PropertyId,
): PropertyView | null {
  let forState = viewCache.get(state);
  if (!forState) {
    forState = new Map();
    viewCache.set(state, forState);
  }
  if (forState.has(propertyId)) return forState.get(propertyId) ?? null;

  const property = propertyById(propertyId);
  const pipeline = state.pipeline[propertyId];
  const model = state.underwriting[propertyId];
  let view: PropertyView | null = null;
  if (property && pipeline && model) {
    const evidence = state.evidence.filter((e) => e.entityId === propertyId);
    const evaluation = evaluateProperty({
      property,
      model,
      gateRecords: state.gates[propertyId] ?? [],
      evidence,
      stage: pipeline.stage,
      preferences: state.preferences,
      weights: state.scoreWeights,
    });
    const liveEvidence = evidence.map((e) => {
      const resolve =
        e.classification === 'CALCULATED'
          ? LIVE_EVIDENCE_METRICS[e.metric]
          : undefined;
      return resolve ? { ...e, value: resolve(evaluation.results) } : e;
    });
    const approvals = state.approvals.filter((a) => a.propertyId === propertyId);
    const readyToAcquire =
      pipeline.stage === 'qualified' &&
      approvals.every(
        (a) =>
          a.decisions['partner-a'] === 'APPROVED' &&
          a.decisions['partner-b'] === 'APPROVED',
      );
    view = {
      ...evaluation,
      property,
      market: marketById(property.marketId) ?? null,
      pipeline,
      model,
      evidence: liveEvidence,
      tasks: state.tasks.filter((t) => t.propertyId === propertyId),
      approvals,
      readyToAcquire,
    };
  }
  forState.set(propertyId, view);
  return view;
}

export interface PortfolioSummaryRow {
  property: Property;
  pipeline: PipelineRecord;
  decision: Decision;
  score: ScoreResult;
  baseAfterFinancingMonthly: number;
  startupCashRequirement: number;
}

export interface PortfolioSummary {
  total: number;
  saved: number;
  rows: PortfolioSummaryRow[];
  byDecision: Record<string, number>;
  /** Cards sitting in `qualified` whose gates have since regressed. */
  regressedQualified: PropertyId[];
}

export function selectPortfolioSummary(state: DemoState): PortfolioSummary {
  const rows: PortfolioSummaryRow[] = [];
  const byDecision: Record<string, number> = {};
  const regressedQualified: PropertyId[] = [];
  let saved = 0;
  for (const [propertyId, pipeline] of Object.entries(state.pipeline)) {
    const view = selectPropertyView(state, propertyId);
    if (!view) continue;
    if (pipeline.saved) saved += 1;
    rows.push({
      property: view.property,
      pipeline,
      decision: view.decision,
      score: view.score,
      baseAfterFinancingMonthly:
        view.results.base.monthlyAverage.afterFinancingCashFlow,
      startupCashRequirement: view.results.base.capital.startupCashRequirement,
    });
    byDecision[view.decision.classification] =
      (byDecision[view.decision.classification] ?? 0) + 1;
    if (pipeline.stage === 'qualified' && !view.decision.canQualify)
      regressedQualified.push(propertyId);
  }
  return { total: rows.length, saved, rows, byDecision, regressedQualified };
}

export function selectPropertyViews(state: DemoState): PropertyView[] {
  const views: PropertyView[] = [];
  for (const propertyId of Object.keys(state.pipeline)) {
    const view = selectPropertyView(state, propertyId);
    if (view) views.push(view);
  }
  return views;
}

export function usePropertyView(propertyId: PropertyId | undefined | null) {
  const state = useStore();
  return useMemo(
    () => (propertyId ? selectPropertyView(state, propertyId) : null),
    [state, propertyId],
  );
}

export function usePropertyViews(): PropertyView[] {
  const state = useStore();
  return useMemo(() => selectPropertyViews(state), [state]);
}

export function usePortfolioSummary(): PortfolioSummary {
  const state = useStore();
  return useMemo(() => selectPortfolioSummary(state), [state]);
}
