import type {
  AcquisitionStage,
  DecisionClass,
  GateStatus,
} from '@/domain/types';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { stageLabel } from '@/domain/crm/stages';
import { cx } from '@/lib/cx';

const DECISION_TONE: Record<DecisionClass, StatusTone> = {
  QUALIFIED: 'positive',
  RESEARCH_CANDIDATE: 'cyan',
  HOLD_UNRESOLVED: 'warning',
  BLOCKED: 'critical',
  REJECTED: 'neutral',
};

const DECISION_LABEL: Record<DecisionClass, string> = {
  QUALIFIED: 'Qualified',
  'RESEARCH_CANDIDATE': 'Research',
  'HOLD_UNRESOLVED': 'On hold',
  BLOCKED: 'Blocked',
  REJECTED: 'Rejected',
};

export function DecisionPill({
  classification,
  className,
}: {
  classification: DecisionClass;
  className?: string;
}) {
  return (
    <StatusPill tone={DECISION_TONE[classification]} className={className}>
      {DECISION_LABEL[classification]}
    </StatusPill>
  );
}

const STAGE_TONE: Record<AcquisitionStage, StatusTone> = {
  discovered: 'neutral',
  'preliminary-screen': 'neutral',
  researching: 'cyan',
  contacted: 'cyan',
  responded: 'cyan',
  interested: 'cyan',
  underwriting: 'violet',
  negotiating: 'violet',
  'landlord-approved': 'violet',
  'final-audit': 'warning',
  qualified: 'positive',
  rejected: 'neutral',
};

export function StagePill({
  stage,
  className,
}: {
  stage: AcquisitionStage;
  className?: string;
}) {
  return (
    <StatusPill tone={STAGE_TONE[stage]} className={className}>
      {stageLabel(stage)}
    </StatusPill>
  );
}

const GATE_TONE: Record<GateStatus, StatusTone> = {
  PASS: 'positive',
  FAIL: 'critical',
  NEEDS_VERIFICATION: 'warning',
  NOT_APPLICABLE: 'neutral',
};

const GATE_LABEL: Record<GateStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NEEDS_VERIFICATION: 'Verify',
  NOT_APPLICABLE: 'N/A',
};

export function GateStatusPill({
  status,
  className,
}: {
  status: GateStatus;
  className?: string;
}) {
  return (
    <StatusPill tone={GATE_TONE[status]} className={className}>
      {GATE_LABEL[status]}
    </StatusPill>
  );
}

const BAND_TONE: Record<string, StatusTone> = {
  strong: 'positive',
  promising: 'cyan',
  weak: 'warning',
  poor: 'critical',
  unavailable: 'neutral',
};

export function ScorePill({
  total,
  band,
  className,
}: {
  total: number | null;
  band: string;
  className?: string;
}) {
  return (
    <StatusPill tone={BAND_TONE[band] ?? 'neutral'} className={className}>
      <span className="tabular-nums">
        {total === null ? '—' : `Score ${Math.round(total)}`}
      </span>
    </StatusPill>
  );
}

export function FormerStrBadge({ className }: { className?: string }) {
  return (
    <StatusPill tone="violet" className={cx('normal-case', className)}>
      Former STR
    </StatusPill>
  );
}
