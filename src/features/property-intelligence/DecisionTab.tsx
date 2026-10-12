import { AlertTriangle, CheckCircle2, RotateCcw, Scale } from 'lucide-react';
import type { PartnerId, ScoreFactor } from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import {
  useActingPartner,
  useDispatch,
  useStore,
  useWorkspace,
} from '@/app/store/StoreContext';
import { PARTNERS } from '@/data/demo/partners';
import { DEFAULT_WEIGHTS } from '@/domain/scoring';
import { WEIGHT_LABELS } from '@/app/store/fieldMeta';
import { formatCurrency } from '@/lib/format';
import { formatScreeningValue } from '@/lib/screeningFormat';
import { cx } from '@/lib/cx';
import { GateStatusPill } from '@/components/property/pills';
import { ScoreRing } from '@/components/charts/ScoreRing';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { Button } from '@/components/ui/Button';
import { NumberField } from '@/components/ui/NumberField';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';

const BANNER_TONE: Record<PropertyView['decision']['classification'], string> = {
  QUALIFIED: 'border-positive/40 bg-positive-soft/30 text-positive',
  RESEARCH_CANDIDATE: 'border-cyan/40 bg-cyan-soft/30 text-cyan',
  HOLD_UNRESOLVED: 'border-warning/40 bg-warning-soft/30 text-warning',
  BLOCKED: 'border-critical/40 bg-critical-soft/30 text-critical',
  REJECTED: 'border-line bg-elevated/60 text-secondary',
};

const FACTOR_LABEL: Record<ScoreFactor, string> = WEIGHT_LABELS;

export function DecisionTab({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const { actingPartner } = useActingPartner();
  const weights = useStore().scoreWeights;
  const { mode } = useWorkspace();
  const { decision, score } = view;
  const factors = score.factors;

  const canQualifyStatement = decision.canQualify
    ? 'Can be moved to Qualified'
    : `Cannot qualify: ${decision.failed.length} failed, ${decision.unresolved.length} unresolved`;

  return (
    <div className="flex flex-col gap-5">
      {/* Classification banner */}
      <div
        role="status"
        className={cx(
          'rounded-xl border px-4 py-3',
          BANNER_TONE[decision.classification],
        )}
      >
        <p className="text-sm font-semibold">{decision.headline}</p>
        <p className="mt-0.5 text-xs opacity-80">{canQualifyStatement}.</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Gates + risks */}
        <div className="flex flex-col gap-5">
          <Panel title="Gate results" flush>
            <ul className="flex flex-col divide-y divide-line">
              {view.gates.map((g) => (
                <li
                  key={g.category}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span className="text-secondary">
                    {g.label}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted">
                      {g.mode}
                    </span>
                  </span>
                  <GateStatusPill status={g.status} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Risks">
            {decision.risks.length === 0 ? (
              <p className="text-sm text-secondary">
                No risk flags from the current evaluation.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {decision.risks.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-2 text-sm text-secondary"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Screening vs preferences">
            <ul className="flex flex-col gap-1.5">
              {view.screening.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-secondary">{check.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted tabular-nums">
                      {formatScreeningValue(check.actual, check.format)}
                    </span>
                    <StatusPill
                      tone={
                        check.status === 'meets'
                          ? 'positive'
                          : check.status === 'misses'
                            ? 'critical'
                            : 'neutral'
                      }
                    >
                      {check.status}
                    </StatusPill>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Score + approvals */}
        <div className="flex flex-col gap-5">
          <Panel title="Advisory score">
            <div className="flex items-start gap-5">
              <ScoreRing
                total={score.total}
                band={score.band}
                size={84}
                ariaLabel={`Advisory score ${score.total === null ? 'unavailable' : Math.round(score.total)} out of 100`}
              />
              <div className="min-w-0 flex-1">
                <HorizontalBars
                  ariaLabel="Score factor breakdown"
                  data={(Object.keys(factors) as ScoreFactor[]).map((f) => ({
                    label: FACTOR_LABEL[f],
                    value: Math.round(factors[f]),
                    fraction: factors[f] / 100,
                    formatted: `${Math.round(factors[f])} / 100`,
                    tone: factors[f] >= 70 ? 'cyan' : factors[f] >= 50 ? 'neutral' : 'warning',
                  }))}
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Advisory — never overrides a failed or unresolved gate.
            </p>

            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Score weights
                </p>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_SCORE_WEIGHTS',
                      patch: { ...DEFAULT_WEIGHTS },
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Reset to defaults
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
                {(Object.keys(weights) as ScoreFactor[]).map((f) => (
                  <NumberField
                    key={f}
                    label={FACTOR_LABEL[f]}
                    value={weights[f]}
                    onChange={(v) =>
                      dispatch({
                        type: 'UPDATE_SCORE_WEIGHTS',
                        patch: { [f]: v },
                      })
                    }
                    min={0}
                    step={1}
                  />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Partner approvals">
            <p className="mb-3 text-[11px] text-muted">
              {mode === 'shared' ? 'Only your authenticated account can decide your approval. Changes to assumptions require new approvals.' : 'Simulated approval — not authenticated.'}
            </p>
            {view.approvals.length === 0 ? (
              <p className="text-sm text-secondary">
                No approval requests for this property yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {view.approvals.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-line bg-sunken/40 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="text-sm font-semibold text-ink tabular-nums">
                        {formatCurrency(a.amount)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {a.kind} · requested by {PARTNERS[a.requestedBy].name}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(['partner-a', 'partner-b'] as PartnerId[]).map((pid) => {
                        const partner = PARTNERS[pid];
                        const slot = a.decisions[pid];
                        const mine = pid === actingPartner.id;
                        return (
                          <div
                            key={pid}
                            className="rounded-lg border border-line bg-surface p-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-ink">
                                {partner.name}
                                {mine && (
                                  <span className="ml-1 text-[10px] font-normal text-cyan">
                                    (acting)
                                  </span>
                                )}
                              </p>
                              <StatusPill
                                tone={
                                  slot === 'APPROVED'
                                    ? 'positive'
                                    : slot === 'DECLINED'
                                      ? 'critical'
                                      : 'neutral'
                                }
                              >
                                {slot === 'APPROVED'
                                  ? 'Approved'
                                  : slot === 'DECLINED'
                                    ? 'Declined'
                                    : 'Pending'}
                              </StatusPill>
                            </div>
                            {mine ? (
                              <div className="mt-2 flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant={slot === 'APPROVED' ? 'secondary' : 'primary'}
                                  disabled={slot === 'APPROVED'}
                                  onClick={() =>
                                    dispatch({
                                      type: 'DECIDE_APPROVAL',
                                      id: a.id,
                                      decision: 'APPROVED',
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={slot === 'DECLINED'}
                                  onClick={() =>
                                    dispatch({
                                      type: 'DECIDE_APPROVAL',
                                      id: a.id,
                                      decision: 'DECLINED',
                                    })
                                  }
                                >
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-muted">
                                {mode === 'shared' ? 'Read-only — this partner must sign in to decide.' : 'Read-only — switch acting partner to decide.'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-line pt-3">
              {view.readyToAcquire ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-positive" role="status">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Ready to acquire — qualified stage with both partner approvals.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-secondary">
                  <Scale className="h-4 w-4 text-muted" aria-hidden />
                  Not ready to acquire — requires the qualified stage and both
                  partner approvals on every request.
                  {mode === 'shared' && ' Shared mode requires budget, lease, and any credit-use request to be saved and approved.'}
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
