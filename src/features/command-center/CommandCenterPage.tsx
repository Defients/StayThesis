import { useMemo } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  ShieldAlert,
} from 'lucide-react';
import type {
  AcquisitionStage,
  PartnerId,
  Task,
} from '@/domain/types';
import { STAGES } from '@/domain/crm/stages';
import { gateLabel } from '@/domain/compliance';
import {
  useActingPartner,
  useDispatch,
  useStore,
} from '@/app/store/StoreContext';
import {
  usePropertyViews,
  type PropertyView,
} from '@/app/store/selectors';
import { MARKETS } from '@/data/demo/markets';
import { propertyById } from '@/data/demo/properties';
import { PARTNERS, PARTNER_LIST } from '@/data/demo/partners';
import { REGULATORY_LABEL, REGULATORY_TONE } from '@/features/markets/marketTones';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';
import { Checkbox } from '@/components/ui/Checkbox';
import { DecisionPill } from '@/components/property/pills';
import { PropertyIllustration } from '@/components/property/PropertyIllustration';
import { formatCurrency } from '@/lib/format';
import { now } from '@/lib/clock';
import { cx } from '@/lib/cx';

const STAGE_ORDER = STAGES.map((s) => s.id);
const stageIndex = (s: AcquisitionStage) => STAGE_ORDER.indexOf(s);
const NEGOTIATING_ON = stageIndex('negotiating');
const CAPITAL_STAGES = new Set<AcquisitionStage>([
  'negotiating',
  'landlord-approved',
  'final-audit',
  'qualified',
]);

const PHASES: { label: string; stages: AcquisitionStage[] }[] = [
  {
    label: 'Discovery',
    stages: ['discovered', 'preliminary-screen', 'researching'],
  },
  { label: 'Outreach', stages: ['contacted', 'responded', 'interested'] },
  {
    label: 'Underwriting & negotiation',
    stages: ['underwriting', 'negotiating', 'landlord-approved'],
  },
  { label: 'Final', stages: ['final-audit', 'qualified'] },
  { label: 'Rejected', stages: ['rejected'] },
];

const PHASE_TONES = ['bg-cyan', 'bg-violet', 'bg-positive', 'bg-warning', 'bg-critical/70'];

function relativeTime(iso: string): string {
  const mins = Math.max(0, (now().getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function greeting(): string {
  const h = now().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface RiskAlert {
  id: string;
  severity: 'critical' | 'warning';
  text: string;
  to: string;
}

/** Derived alerts — every entry links to the tab that resolves it. */
function deriveAlerts(views: PropertyView[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  for (const v of views) {
    const { property, pipeline, decision } = v;
    if (pipeline.stage === 'qualified' && !decision.canQualify) {
      alerts.push({
        id: `${property.id}-regression`,
        severity: 'critical',
        text: `${property.name}: qualified but gates regressed — review immediately`,
        to: `/property/${property.id}/compliance`,
      });
      continue; // regression supersedes the per-gate alert below
    }
    if (pipeline.stage !== 'rejected') {
      const criticalFailed = v.gates.filter(
        (g) => g.critical && decision.failed.includes(g.category),
      );
      if (criticalFailed.length > 0)
        alerts.push({
          id: `${property.id}-failed`,
          severity: 'critical',
          text: `${property.name}: ${criticalFailed.map((g) => g.label).join(', ')} failed`,
          to: `/property/${property.id}/compliance`,
        });
      if (v.results.base.warnings.includes('promo-balance-remaining'))
        alerts.push({
          id: `${property.id}-promo`,
          severity: 'warning',
          text: `${property.name}: balance remains when the promotional APR ends`,
          to: `/property/${property.id}/underwriting`,
        });
      if (
        stageIndex(pipeline.stage) >= NEGOTIATING_ON &&
        stageIndex(pipeline.stage) < stageIndex('rejected') &&
        v.results.conservative.annual.operatingCashFlow < 0
      )
        alerts.push({
          id: `${property.id}-cons`,
          severity: 'warning',
          text: `${property.name}: conservative case loses money — stage is ${pipeline.stage}`,
          to: `/property/${property.id}/underwriting`,
        });
      const stale = v.evidence.filter(
        (e) => e.historyState === 'DISPUTED' || e.historyState === 'STALE',
      );
      if (stale.length > 0)
        alerts.push({
          id: `${property.id}-evidence`,
          severity: 'warning',
          text: `${property.name}: ${stale.length} evidence record${stale.length > 1 ? 's' : ''} disputed or stale`,
          to: `/property/${property.id}/evidence`,
        });
    }
  }
  return alerts;
}

function deriveNextStep(v: PropertyView): string {
  const { decision, pipeline, approvals } = v;
  if (decision.unresolved.length > 0)
    return `Verify ${gateLabel(decision.unresolved[0]!)}`;
  const pending = approvals
    .flatMap((a) =>
      (Object.keys(a.decisions) as PartnerId[]).filter(
        (p) => a.decisions[p] === 'PENDING',
      ),
    )
    .map((p) => PARTNERS[p].name.split(' ')[0]);
  if (pipeline.stage === 'qualified' && pending.length > 0)
    return `Awaiting ${pending[0]}'s approval`;
  if (decision.failed.length > 0)
    return `Resolve ${gateLabel(decision.failed[0]!)}`;
  if (decision.canQualify && pipeline.stage !== 'qualified')
    return 'Move to Qualified';
  return 'Review underwriting';
}

const DECISION_RANK: Record<string, number> = {
  QUALIFIED: 0,
  RESEARCH_CANDIDATE: 1,
  HOLD_UNRESOLVED: 1,
  BLOCKED: 2,
  REJECTED: 3,
};

export default function CommandCenterPage() {
  const store = useStore();
  const dispatch = useDispatch();
  const { actingPartner } = useActingPartner();
  const views = usePropertyViews();

  const today = now().toISOString().slice(0, 10);
  const nonRejected = views.filter((v) => v.pipeline.stage !== 'rejected');
  const alerts = useMemo(() => deriveAlerts(views), [views]);

  const phaseCounts = useMemo(
    () =>
      PHASES.map((p) => ({
        ...p,
        count: views.filter((v) => p.stages.includes(v.pipeline.stage)).length,
      })),
    [views],
  );

  const priorities = useMemo(
    () =>
      [...nonRejected]
        .sort((a, b) => {
          const r =
            (DECISION_RANK[a.decision.classification] ?? 9) -
            (DECISION_RANK[b.decision.classification] ?? 9);
          if (r !== 0) return r;
          return (b.score.total ?? -1) - (a.score.total ?? -1);
        })
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [views],
  );

  // Top priority — the single most actionable thing in the workspace.
  const topPriority = useMemo(() => {
    const awaiting = views.find(
      (v) =>
        v.decision.canQualify &&
        v.approvals.some((a) =>
          Object.values(a.decisions).includes('PENDING'),
        ),
    );
    if (awaiting) {
      const pendingPartner = awaiting.approvals
        .flatMap((a) =>
          (Object.keys(a.decisions) as PartnerId[]).filter(
            (p) => a.decisions[p] === 'PENDING',
          ),
        )[0];
      return {
        text: `${awaiting.property.name} meets every gate — awaiting ${pendingPartner ? PARTNERS[pendingPartner].name.split(' ')[0] + "'s" : 'partner'} approval`,
        to: `/property/${awaiting.property.id}/decision`,
        cta: 'Review decision',
      };
    }
    const ready = views.find(
      (v) => v.decision.canQualify && v.pipeline.stage !== 'qualified',
    );
    if (ready)
      return {
        text: `${ready.property.name} meets every gate — ready to move to Qualified`,
        to: `/crm?property=${ready.property.id}`,
        cta: 'Open in CRM',
      };
    const next = priorities[0];
    if (next)
      return {
        text: `${next.property.name} — ${deriveNextStep(next)}`,
        to: `/property/${next.property.id}`,
        cta: 'Open property',
      };
    return { text: 'Review the pipeline', to: '/crm', cta: 'Open CRM' };
  }, [views, priorities]);

  const marketsActive = MARKETS.filter((m) => m.status === 'active-research');
  const marketsWatchlist = MARKETS.filter((m) => m.status === 'watchlist');
  const savedCount = views.filter((v) => v.pipeline.saved).length;
  const underwritingStageCount = views.filter(
    (v) => v.pipeline.stage === 'underwriting',
  ).length;
  const underwritingEdits = store.activity.filter(
    (a) => a.kind === 'underwriting-change',
  ).length;
  const qualifiedCount = views.filter(
    (v) => v.pipeline.stage === 'qualified',
  ).length;
  const readyCount = views.filter((v) => v.readyToAcquire).length;
  const capitalViews = views.filter((v) => CAPITAL_STAGES.has(v.pipeline.stage));
  const capitalTotal = capitalViews.reduce(
    (s, v) => s + v.results.base.capital.totalCommittedCapital,
    0,
  );

  return (
    <div className="space-y-5">
      {/* Hero -------------------------------------------------------------- */}
      <header className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface via-surface to-violet/10 px-6 py-6 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan to-violet"
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Command Center · Demo workspace
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {greeting()},{' '}
          <span className="bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">
            {actingPartner.name.split(' ')[0]}
          </span>
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Find the property. Prove the thesis.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunken/70 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-cyan">
              Top priority
            </span>
            {topPriority.text}
          </p>
          <Link
            to={topPriority.to}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan/15 px-3 py-1.5 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/25"
          >
            {topPriority.cta}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* KPI row ------------------------------------------------------------ */}
      <section
        aria-label="Portfolio summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        <Kpi label="Active research markets" to="/markets">
          <KpiValue>{marketsActive.length}</KpiValue>
          <p className="text-[11px] text-muted">
            {marketsActive.length} active · {marketsWatchlist.length} watchlist
          </p>
        </Kpi>
        <Kpi label="Pipeline candidates" to="/crm">
          <KpiValue>{nonRejected.length}</KpiValue>
          <div
            aria-hidden
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-elevated"
          >
            {phaseCounts.map((p, i) =>
              p.count > 0 && p.label !== 'Rejected' ? (
                <span
                  key={p.label}
                  className={PHASE_TONES[i]}
                  style={{
                    width: `${(p.count / Math.max(nonRejected.length, 1)) * 100}%`,
                  }}
                />
              ) : null,
            )}
          </div>
        </Kpi>
        <Kpi label="Saved candidates" to="/properties?saved=1">
          <KpiValue>{savedCount}</KpiValue>
          <p className="text-[11px] text-muted">shortlisted for review</p>
        </Kpi>
        <Kpi label="Underwriting activity" to="/crm">
          <KpiValue>{underwritingStageCount}</KpiValue>
          <p className="text-[11px] text-muted">
            {underwritingEdits} edits logged
          </p>
        </Kpi>
        <Kpi label="Qualified / ready" to="/crm">
          <KpiValue>
            {qualifiedCount}
            <span className="text-sm text-muted"> / {readyCount}</span>
          </KpiValue>
          <p className="text-[11px] text-muted">ready to acquire</p>
        </Kpi>
        <Kpi label="Open risk alerts" to="/crm">
          <KpiValue
            className={alerts.some((a) => a.severity === 'critical') ? 'text-critical' : 'text-warning'}
          >
            {alerts.length}
          </KpiValue>
          <p className="text-[11px] text-muted">
            {alerts.filter((a) => a.severity === 'critical').length} critical
          </p>
        </Kpi>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Pipeline funnel -------------------------------------------------- */}
        <Panel title="Pipeline funnel" className="xl:col-span-2">
          <div className="space-y-3">
            {phaseCounts.map((phase, i) => {
              const max = Math.max(...phaseCounts.map((p) => p.count), 1);
              return (
                <Link
                  key={phase.label}
                  to="/crm"
                  className="group block"
                  aria-label={`${phase.label}: ${phase.count} properties — open CRM`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-secondary group-hover:text-ink">
                      {phase.label}
                    </span>
                    <span className="tabular-nums text-muted">
                      {phase.count}
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={cx('h-full rounded-full transition-all', PHASE_TONES[i])}
                      style={{ width: `${(phase.count / max) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] capitalize text-muted">
                    {phase.stages.map((s) => s.replace(/-/g, ' ')).join(' · ')}
                  </p>
                </Link>
              );
            })}
          </div>
        </Panel>

        {/* Recent activity -------------------------------------------------- */}
        <Panel title="Recent activity">
          <ul className="space-y-3">
            {store.activity.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-start gap-2.5">
                <span
                  className={cx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                    e.actor === 'system'
                      ? 'bg-elevated text-muted'
                      : 'bg-gradient-to-br from-cyan/30 to-violet/30 text-ink',
                  )}
                >
                  {e.actor === 'system' ? 'SYS' : PARTNERS[e.actor].initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-secondary">
                    {e.propertyId ? (
                      <Link
                        to={`/property/${e.propertyId}`}
                        className="text-cyan hover:underline"
                      >
                        {propertyById(e.propertyId)?.name ?? e.propertyId}
                      </Link>
                    ) : null}
                    {e.propertyId ? ' — ' : ''}
                    {e.message}
                  </p>
                  <p className="text-[10px] text-muted">
                    {e.actor === 'system' ? 'System' : PARTNERS[e.actor].name} ·{' '}
                    {relativeTime(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Acquisition priorities --------------------------------------------- */}
      <Panel title="Acquisition priorities">
        <div className="grid gap-4 md:grid-cols-3">
          {priorities.map((v) => (
            <Link
              key={v.property.id}
              to={`/property/${v.property.id}`}
              className="group overflow-hidden rounded-xl border border-line bg-sunken/60 transition-colors hover:border-line-strong"
            >
              <PropertyIllustration
                illustration={v.property.illustration}
                label={v.property.name}
                className="rounded-none"
              />
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink group-hover:text-cyan">
                      {v.property.name}
                    </p>
                    <p className="text-xs text-muted">
                      {v.market?.city} · {formatCurrency(v.property.monthlyRent)}/mo
                    </p>
                  </div>
                  <DecisionPill classification={v.decision.classification} />
                </div>
                <p className="text-xs text-secondary">
                  Base after-financing{' '}
                  <span
                    className={cx(
                      'font-semibold tabular-nums',
                      v.results.base.monthlyAverage.afterFinancingCashFlow < 0
                        ? 'text-critical'
                        : 'text-positive',
                    )}
                  >
                    {formatCurrency(
                      v.results.base.monthlyAverage.afterFinancingCashFlow,
                    )}
                    /mo
                  </span>
                </p>
                <p className="flex items-center gap-1.5 text-xs font-medium text-cyan">
                  <CircleCheck aria-hidden className="h-3.5 w-3.5" />
                  {deriveNextStep(v)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Risk & compliance alerts ------------------------------------------ */}
        <Panel title="Risk & compliance alerts">
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-secondary">
              <CircleCheck aria-hidden className="h-4 w-4 text-positive" />
              No open alerts — gates, financing and evidence are all clean.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.to}
                    className={cx(
                      'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      a.severity === 'critical'
                        ? 'border-critical/40 bg-critical/10 text-critical hover:bg-critical/15'
                        : 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/15',
                    )}
                  >
                    {a.severity === 'critical' ? (
                      <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {a.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Partner tasks ------------------------------------------------------ */}
        <Panel title="Partner tasks">
          <div className="grid gap-4 sm:grid-cols-2">
            {PARTNER_LIST.map((p) => {
              const tasks = store.tasks.filter(
                (t) => t.assigneeId === p.id && !t.done,
              );
              return (
                <div key={p.id}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 text-[8px] font-bold text-ink">
                      {p.initials}
                    </span>
                    {p.name}
                    <span className="text-muted">({tasks.length})</span>
                  </p>
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted">All clear.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {tasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          overdue={t.dueDate < today}
                          onToggle={() =>
                            dispatch({ type: 'TOGGLE_TASK', id: t.id })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            to="/crm"
            className="mt-3 inline-block text-xs font-medium text-cyan hover:underline"
          >
            View all →
          </Link>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Capital exposure --------------------------------------------------- */}
        <Panel title="Illustrative capital exposure">
          {capitalViews.length === 0 ? (
            <p className="text-sm text-muted">
              No properties in negotiation or later stages.
            </p>
          ) : (
            <div className="space-y-3">
              {capitalViews.map((v) => {
                const c = v.results.base.capital;
                const segments = [
                  {
                    label: 'Non-refundable startup',
                    value: c.nonRefundableStartup,
                    cls: 'bg-critical/70',
                  },
                  {
                    label: 'Refundable deposit',
                    value: c.refundableDeposit,
                    cls: 'bg-warning/80',
                  },
                  { label: 'Operating reserve', value: c.operatingReserve, cls: 'bg-cyan/80' },
                ];
                const total = Math.max(c.totalCommittedCapital, 1);
                return (
                  <Link
                    key={v.property.id}
                    to={`/property/${v.property.id}/underwriting`}
                    className="block"
                  >
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-secondary">
                        {v.property.name}
                      </span>
                      <span className="tabular-nums text-ink">
                        {formatCurrency(c.totalCommittedCapital)}
                      </span>
                    </div>
                    <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-elevated">
                      {segments.map((s) => (
                        <span
                          key={s.label}
                          title={`${s.label}: ${formatCurrency(s.value)}`}
                          className={cx('h-full', s.cls)}
                          style={{ width: `${(s.value / total) * 100}%` }}
                        />
                      ))}
                    </div>
                  </Link>
                );
              })}
              <div className="flex items-baseline justify-between border-t border-line pt-2 text-sm">
                <span className="font-medium text-secondary">
                  Total committed capital
                </span>
                <span className="font-display font-semibold tabular-nums text-ink">
                  {formatCurrency(capitalTotal)}
                  <span className="ml-2 text-xs font-normal text-muted">
                    vs {formatCurrency(store.preferences.maxStartupExposure)} max
                    exposure
                  </span>
                </span>
              </div>
              <div className="flex gap-4 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-critical/70" />
                  Non-refundable startup
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-warning/80" />
                  Refundable deposit
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-cyan/80" />
                  Reserve
                </span>
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted">
            Illustrative — modeled capital if these deals proceeded. No money is
            committed.
          </p>
        </Panel>

        {/* Market snapshot ----------------------------------------------------- */}
        <Panel title="Market snapshot">
          <ul className="space-y-2">
            {marketsActive.map((m) => {
              const count = nonRejected.filter(
                (v) => v.property.marketId === m.id,
              ).length;
              return (
                <li key={m.id}>
                  <Link
                    to={`/markets?market=${m.id}`}
                    className="flex items-center justify-between rounded-lg border border-line bg-sunken/60 px-3 py-2.5 transition-colors hover:border-line-strong"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {m.city}, {m.stateCode}
                      </p>
                      <p className="text-xs text-muted">
                        {count} candidate{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <StatusPill tone={REGULATORY_TONE[m.regulatoryStatus]}>
                      {REGULATORY_LABEL[m.regulatoryStatus]}
                    </StatusPill>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[10px] text-muted">
            Modeled (demo) — synthetic market data, not live listings.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  label,
  to,
  children,
}: {
  label: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-line-strong"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </Link>
  );
}

function KpiValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'font-display text-xl font-semibold tabular-nums text-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}

function TaskRow({
  task,
  overdue,
  onToggle,
}: {
  task: Task;
  overdue: boolean;
  onToggle: () => void;
}) {
  const property = task.propertyId ? propertyById(task.propertyId) : undefined;
  return (
    <li
      className={cx(
        'rounded-lg border px-2.5 py-2',
        overdue ? 'border-critical/40 bg-critical/5' : 'border-line bg-sunken/60',
      )}
    >
      <Checkbox checked={task.done} onChange={onToggle} label={task.title} />
      <p
        className={cx(
          'ml-7 text-[10px]',
          overdue ? 'font-semibold text-critical' : 'text-muted',
        )}
      >
        due {task.dueDate}
        {overdue ? ' — overdue' : ''}
        {property ? (
          <>
            {' · '}
            <Link
              to={`/property/${property.id}`}
              className="text-cyan hover:underline"
            >
              {property.name}
            </Link>
          </>
        ) : null}
      </p>
    </li>
  );
}
