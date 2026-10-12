import { Link } from 'react-router';
import { ArrowRight, Building2, FlaskConical, X } from 'lucide-react';
import type { Market, Property } from '@/domain/types';
import { BarChart, MONTH_LABELS } from '@/components/charts/BarChart';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { formatCurrency, formatPercent } from '@/lib/format';
import { CONFIDENCE_TONE, REGULATORY_LABEL, REGULATORY_TONE, STATUS_LABEL, STATUS_TONE } from './marketTones';

export function MarketDetailPanel({
  market,
  candidates,
  onClose,
}: {
  market: Market;
  candidates: Property[];
  onClose: () => void;
}) {
  return (
    <Panel
      title={
        <span className="flex items-baseline gap-2">
          {market.city}, {market.state}
          <StatusPill tone={STATUS_TONE[market.status]}>
            {STATUS_LABEL[market.status]}
          </StatusPill>
        </span>
      }
      actions={
        <IconButton label="Close market detail" onClick={onClose} size="sm">
          <X className="h-4 w-4" />
        </IconButton>
      }
      className="border-line-strong"
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-secondary">{market.summary}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['Modeled ADR', formatCurrency(market.metrics.adr)],
              ['Modeled occupancy', formatPercent(market.metrics.occupancyRate)],
              ['Modeled revenue / mo', formatCurrency(market.metrics.modeledMonthlyRevenue)],
              ['Median 2BR rent', formatCurrency(market.metrics.medianRent2br)],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {label}
              </p>
              <p className="font-display text-lg font-semibold text-ink tabular-nums">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="-mt-3 flex items-center gap-1 text-[10px] text-muted">
          <FlaskConical className="h-3 w-3" aria-hidden /> All figures Modeled (demo)
        </p>

        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
            Seasonality — occupancy index (bars) × ADR index (line)
          </h3>
          <BarChart
            data={market.seasonality.map((s, i) => ({
              label: MONTH_LABELS[i] ?? String(i + 1),
              value: s.occupancyIndex,
            }))}
            line={{
              label: 'ADR index',
              data: market.seasonality.map((s) => s.adrIndex),
            }}
            valueFormatter={(v) => v.toFixed(1)}
            lineValueFormatter={(v) => v.toFixed(2)}
            ariaLabel={`Seasonality for ${market.city}: monthly occupancy index bars and ADR index line`}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              Demand drivers
            </h3>
            <HorizontalBars
              ariaLabel={`Demand drivers for ${market.city}`}
              data={market.demandDrivers.map((d) => ({
                label: d.name,
                value: d.strength,
                fraction: d.strength / 5,
                formatted: `${d.strength}/5`,
                tone: d.strength >= 4 ? 'cyan' : 'neutral',
              }))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                Regulatory posture
              </h3>
              <StatusPill tone={REGULATORY_TONE[market.regulatoryStatus]}>
                {REGULATORY_LABEL[market.regulatoryStatus]}
              </StatusPill>
              <p className="mt-2 text-xs leading-relaxed text-secondary">
                {market.regulatoryNote}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-warning">
                Demo assumption — verify with the municipality
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                Research confidence
              </h3>
              <StatusPill tone={CONFIDENCE_TONE[market.researchConfidence]}>
                {market.researchConfidence}
              </StatusPill>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Candidates ({candidates.length})
          </h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted">No demo properties in this market yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {candidates.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/property/${p.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-ink transition-colors hover:bg-elevated/50"
                  >
                    <span>
                      <span className="mr-2 text-[11px] font-semibold text-muted">{p.code}</span>
                      {p.name}
                    </span>
                    <span className="text-xs text-secondary tabular-nums">
                      {formatCurrency(p.monthlyRent)}/mo
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to={`/properties?market=${market.id}`} className="self-start">
          <Button>
            View {candidates.length} {candidates.length === 1 ? 'property' : 'properties'} in Explorer
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </div>
    </Panel>
  );
}
