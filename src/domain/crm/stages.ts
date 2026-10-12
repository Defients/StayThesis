import type { AcquisitionStage, Decision } from '../types';

export interface StageDefinition {
  id: AcquisitionStage;
  label: string;
}

/** Pipeline stages in order (spec §6 / types.ts ordering). */
export const STAGES: readonly StageDefinition[] = [
  { id: 'discovered', label: 'Discovered' },
  { id: 'preliminary-screen', label: 'Preliminary screen' },
  { id: 'researching', label: 'Researching' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'responded', label: 'Responded' },
  { id: 'interested', label: 'Interested' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'landlord-approved', label: 'Landlord approved' },
  { id: 'final-audit', label: 'Final audit' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'rejected', label: 'Rejected' },
];

export function stageLabel(stage: AcquisitionStage): string {
  return STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export interface StageMoveCheck {
  allowed: boolean;
  /** Human-readable refusal reason for the notice toast, when refused. */
  reason: string | null;
}

/**
 * Stage rule (spec §3): a card may move to `qualified` only when the decision
 * canQualify — every critical gate PASS or N/A and the card isn't rejected.
 * Every other move (including to `rejected`) is allowed.
 */
export function canMoveToStage(
  target: AcquisitionStage,
  decision: Decision,
): StageMoveCheck {
  if (target === 'qualified' && !decision.canQualify) {
    const blockers =
      decision.failed.length > 0
        ? `${decision.failed.length} failed gate${decision.failed.length > 1 ? 's' : ''}`
        : `${decision.unresolved.length} unresolved gate${decision.unresolved.length > 1 ? 's' : ''}`;
    return {
      allowed: false,
      reason: `Cannot qualify — ${blockers} must clear first`,
    };
  }
  return { allowed: true, reason: null };
}
