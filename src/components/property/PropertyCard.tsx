import { Link } from 'react-router';
import { ArrowRight, Bookmark, SquareCheckBig, Square } from 'lucide-react';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import type { PropertyView } from '@/app/store/selectors';
import { formatCurrency, formatNumber } from '@/lib/format';
import { cx } from '@/lib/cx';
import { PropertyIllustration } from './PropertyIllustration';
import { DecisionPill, FormerStrBadge, StagePill } from './pills';
import { ScoreRing } from '@/components/charts/ScoreRing';
import { DemoBadge } from '@/components/ui/DemoBadge';

const TYPE_LABEL: Record<PropertyView['property']['type'], string> = {
  'single-family': 'Single-family',
  townhouse: 'Townhouse',
  duplex: 'Duplex',
  adu: 'ADU',
  condo: 'Condo',
};

export function PropertyCard({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const { compare } = useStore();
  const { property, pipeline, decision, score, results } = view;
  const inCompare = compare.includes(property.id);
  const monthly = results.base.monthlyAverage.afterFinancingCashFlow;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative p-3 pb-0">
        <PropertyIllustration
          illustration={property.illustration}
          label={`Illustration of ${property.name}`}
        />
        <div className="absolute right-5 top-5">
          <DemoBadge />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {property.code}
            </span>
            <button
              type="button"
              aria-pressed={pipeline.saved}
              aria-label={pipeline.saved ? `Unsave ${property.name}` : `Save ${property.name}`}
              onClick={() => dispatch({ type: 'TOGGLE_SAVED', propertyId: property.id })}
              className={cx(
                'rounded-md p-1 transition-colors',
                pipeline.saved ? 'text-cyan' : 'text-muted hover:text-ink',
              )}
            >
              <Bookmark
                className="h-4 w-4"
                fill={pipeline.saved ? 'currentColor' : 'none'}
                aria-hidden
              />
            </button>
          </div>
          <h3 className="font-display text-base font-semibold leading-tight text-ink">
            <Link
              to={`/property/${property.id}`}
              className="transition-colors hover:text-cyan"
            >
              {property.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-secondary">
            {view.market ? `${view.market.city}, ${view.market.stateCode}` : '—'}
            {' · '}
            {TYPE_LABEL[property.type]} · {property.bedrooms} bd ·{' '}
            {property.bathrooms} ba · {formatNumber(property.squareFeet)} sqft
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Rent · base after-fin/mo
            </p>
            <p className="font-display text-sm font-semibold text-ink tabular-nums">
              {formatCurrency(property.monthlyRent)}
              <span className="mx-1 text-muted">·</span>
              <span className={monthly >= 0 ? 'text-positive' : 'text-critical'}>
                {formatCurrency(monthly)}
              </span>
            </p>
          </div>
          <ScoreRing
            total={score.total}
            band={score.band}
            size={44}
            ariaLabel={`Advisory score ${score.total === null ? 'unavailable' : Math.round(score.total)} out of 100`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <DecisionPill classification={decision.classification} />
          <StagePill stage={pipeline.stage} />
          {property.formerStr && <FormerStrBadge />}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <button
            type="button"
            aria-pressed={inCompare}
            onClick={() =>
              dispatch({ type: 'TOGGLE_COMPARE', propertyId: property.id })
            }
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors',
              inCompare ? 'text-cyan' : 'text-secondary hover:text-ink',
            )}
          >
            {inCompare ? (
              <SquareCheckBig className="h-4 w-4" aria-hidden />
            ) : (
              <Square className="h-4 w-4" aria-hidden />
            )}
            Compare
          </button>
          <Link
            to={`/property/${property.id}`}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-cyan transition-colors hover:text-ink"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
