import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Columns2 } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { usePropertyViews } from '@/app/store/selectors';
import { useStore } from '@/app/store/StoreContext';
import type { PropertyView } from '@/app/store/selectors';
import { gateLabel } from '@/domain/compliance';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScoreRing } from '@/components/charts/ScoreRing';
import { DecisionPill, FormerStrBadge, StagePill } from '@/components/property/pills';
import { PropertyIllustration } from '@/components/property/PropertyIllustration';
import {
  formatCurrency,
  formatMonths,
  formatPercent,
  formatRatio,
} from '@/lib/format';
import { cx } from '@/lib/cx';

interface Row {
  label: string;
  get: (v: PropertyView) => number | null;
  format: (n: number | null) => string;
  /** 'max' | 'min' — which direction is best; undefined = no highlight */
  best?: 'max' | 'min';
}

const ROWS: Row[] = [
  { label: 'Monthly rent', get: (v) => v.property.monthlyRent, format: formatCurrency, best: 'min' },
  { label: 'Startup cash', get: (v) => v.results.base.capital.startupCashRequirement, format: formatCurrency, best: 'min' },
  { label: 'Total committed capital', get: (v) => v.results.base.capital.totalCommittedCapital, format: formatCurrency, best: 'min' },
  { label: 'Base after-financing /mo', get: (v) => v.results.base.monthlyAverage.afterFinancingCashFlow, format: formatCurrency, best: 'max' },
  { label: 'Conservative after-financing /mo', get: (v) => v.results.conservative.monthlyAverage.afterFinancingCashFlow, format: formatCurrency, best: 'max' },
  { label: 'Cash-on-cash (yr 1)', get: (v) => v.results.base.cashOnCash, format: (n) => formatPercent(n), best: 'max' },
  { label: 'Revenue ÷ rent', get: (v) => v.results.base.revenueToRent, format: (n) => formatRatio(n), best: 'max' },
  { label: 'Operating break-even occupancy', get: (v) => v.results.base.breakEven.operating.occupancy, format: (n) => formatPercent(n), best: 'min' },
  { label: 'Payback', get: (v) => v.results.base.paybackMonths, format: (n) => formatMonths(n), best: 'min' },
  { label: 'Score', get: (v) => v.score.total, format: (n) => (n === null ? '—' : `${Math.round(n)}`), best: 'max' },
];

function bestIndex(views: PropertyView[], row: Row): number {
  if (!row.best) return -1;
  let best = -1;
  let bestVal = row.best === 'max' ? -Infinity : Infinity;
  views.forEach((v, i) => {
    const n = row.get(v);
    if (n === null) return;
    if (row.best === 'max' && n > bestVal) { bestVal = n; best = i; }
    if (row.best === 'min' && n < bestVal) { bestVal = n; best = i; }
  });
  return best;
}

export default function ComparePage() {
  useDocumentTitle('Compare properties — StayThesis');
  const [searchParams] = useSearchParams();
  const { compare } = useStore();
  const views = usePropertyViews();

  const ids = useMemo(() => {
    const param = searchParams.get('ids');
    return param ? param.split(',').filter(Boolean) : compare;
  }, [searchParams, compare]);

  const selected = ids
    .map((id) => views.find((v) => v.property.id === id))
    .filter((v): v is PropertyView => !!v);

  if (selected.length < 2) {
    return (
      <>
        <PageHeader
          index="03"
          title="Compare properties"
          description="Select at least two properties in the Explorer to compare side by side."
        />
        <EmptyState
          icon={Columns2}
          title="Nothing to compare"
          body="Pick two or three properties with the Compare checkbox on any card, or open a compare link with ?ids=."
          action={
            <Link to="/properties">
              <Button variant="secondary" size="sm">Back to Explorer</Button>
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        index="03"
        title="Compare properties"
        description="Side-by-side actual records. Best value per metric row is subtly highlighted. All figures Modeled (demo)."
        actions={
          <Link to="/properties">
            <Button variant="ghost" size="sm">← Back to Explorer</Button>
          </Link>
        }
      />

      <Panel className="overflow-hidden" flush>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Metric
                </th>
                {selected.map((v) => (
                  <th key={v.property.id} className="min-w-52 px-4 py-3 text-left align-top">
                    <div className="mb-2 w-40">
                      <PropertyIllustration
                        illustration={v.property.illustration}
                        label={`Illustration of ${v.property.name}`}
                      />
                    </div>
                    <Link
                      to={`/property/${v.property.id}`}
                      className="font-display text-sm font-semibold text-ink hover:text-cyan"
                    >
                      {v.property.name}
                    </Link>
                    <p className="text-[11px] font-medium text-muted">
                      {v.property.code} · {v.market?.city ?? '—'}, {v.market?.stateCode ?? ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <StagePill stage={v.pipeline.stage} />
                      {v.property.formerStr && <FormerStrBadge />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = bestIndex(selected, row);
                return (
                  <tr key={row.label} className="border-b border-line/60 last:border-0">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-secondary">
                      {row.label}
                    </th>
                    {selected.map((v, i) => (
                      <td
                        key={v.property.id}
                        className={cx(
                          'px-4 py-2.5 tabular-nums',
                          i === best && 'bg-cyan-soft/60 font-semibold text-ink',
                          i !== best && 'text-secondary',
                        )}
                      >
                        {row.label === 'Score' ? (
                          <span className="inline-flex items-center gap-2">
                            <ScoreRing
                              total={v.score.total}
                              band={v.score.band}
                              size={30}
                              ariaLabel={`Score ${v.score.total === null ? 'unavailable' : Math.round(v.score.total)}`}
                            />
                            {row.format(row.get(v))}
                          </span>
                        ) : (
                          row.format(row.get(v))
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {/* decision row */}
              <tr className="border-b border-line/60">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-secondary">Decision</th>
                {selected.map((v) => (
                  <td key={v.property.id} className="px-4 py-2.5">
                    <DecisionPill classification={v.decision.classification} />
                  </td>
                ))}
              </tr>
              {/* failed / unresolved gates */}
              <tr className="border-b border-line/60">
                <th className="px-4 py-2.5 align-top text-left text-xs font-medium text-secondary">
                  Failed / unresolved gates
                </th>
                {selected.map((v) => {
                  const bad = v.gates.filter(
                    (g) => g.status === 'FAIL' || g.status === 'NEEDS_VERIFICATION',
                  );
                  return (
                    <td key={v.property.id} className="px-4 py-2.5 align-top">
                      {bad.length === 0 ? (
                        <span className="text-xs text-positive">None</span>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {bad.map((g) => (
                            <li key={g.category}>
                              <StatusPill tone={g.status === 'FAIL' ? 'critical' : 'warning'}>
                                {gateLabel(g.category)}
                              </StatusPill>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* amenities */}
              <tr>
                <th className="px-4 py-2.5 align-top text-left text-xs font-medium text-secondary">Amenities</th>
                {selected.map((v) => (
                  <td key={v.property.id} className="px-4 py-2.5 align-top">
                    <p className="text-xs leading-relaxed text-secondary">
                      {v.property.amenities.join(' · ') || '—'}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
