import type {
  ActivityEvent,
  ApprovalRequest,
  ChecklistItem,
  EvidenceRecord,
  GateRecord,
  OutreachDraft,
  PartnerId,
  PipelineRecord,
  PlanningPreferences,
  PropertyId,
  ScoreWeights,
  Task,
  UnderwritingModel,
} from '@/domain/types';
import { DEFAULT_PREFERENCES } from '@/domain/preferences';
import { DEFAULT_WEIGHTS } from '@/domain/scoring';
import { buildDemoSeed } from '@/data/demo/seed';

export interface Notice {
  tone: 'positive' | 'warning' | 'critical';
  message: string;
}

/** Mutable demo state (spec §6). Static records live in src/data/demo. */
export interface DemoState {
  actingPartnerId: PartnerId;
  preferences: PlanningPreferences;
  scoreWeights: ScoreWeights;
  pipeline: Record<PropertyId, PipelineRecord>;
  underwriting: Record<PropertyId, UnderwritingModel>;
  gates: Record<PropertyId, GateRecord[]>;
  checklist: ChecklistItem[];
  evidence: EvidenceRecord[];
  tasks: Task[];
  approvals: ApprovalRequest[];
  outreach: OutreachDraft[];
  /** Newest first. */
  activity: ActivityEvent[];
  /** Max 3 property ids. */
  compare: PropertyId[];
  lastViewedPropertyId: PropertyId | null;
  notice: Notice | null;
}

/**
 * Fresh state with deep-cloned seeds — RESET_DEMO restores this exactly, so
 * nothing mutable can leak back into the seed constants.
 */
export function createInitialState(): DemoState {
  const seed = buildDemoSeed();
  return {
    actingPartnerId: 'partner-a',
    preferences: structuredClone(DEFAULT_PREFERENCES),
    scoreWeights: { ...DEFAULT_WEIGHTS },
    pipeline: structuredClone(seed.pipeline),
    underwriting: structuredClone(seed.underwriting),
    gates: structuredClone(seed.gates),
    checklist: structuredClone(seed.checklist),
    evidence: structuredClone(seed.evidence),
    tasks: structuredClone(seed.tasks),
    approvals: structuredClone(seed.approvals),
    outreach: structuredClone(seed.outreach),
    activity: structuredClone(seed.activity),
    compare: [],
    lastViewedPropertyId: null,
    notice: null,
  };
}
