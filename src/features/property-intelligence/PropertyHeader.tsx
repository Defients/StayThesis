import { Link } from 'react-router';
import { Bookmark, Columns2, ExternalLink } from 'lucide-react';
import type { PropertyView } from '@/app/store/selectors';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { PARTNER_LIST } from '@/data/demo/partners';
import { STAGES, stageLabel } from '@/domain/crm/stages';
import { PROPERTY_TYPE_LABEL } from '@/lib/labels';
import { formatCurrency } from '@/lib/format';
import { PropertyIllustration } from '@/components/property/PropertyIllustration';
import {
  DecisionPill,
  FormerStrBadge,
  StagePill,
} from '@/components/property/pills';
import { ScoreRing } from '@/components/charts/ScoreRing';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { Select } from '@/components/ui/Select';
import { cx } from '@/lib/cx';

export function PropertyHeader({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const inCompare = useStore().compare.includes(view.property.id);
  const { property, pipeline, market, decision, score } = view;

  return (
    <header className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="w-40 shrink-0">
          <PropertyIllustration
            illustration={property.illustration}
            label={`Illustration of ${property.name}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold tracking-wider text-muted">
              {property.code}
            </span>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
              {property.name}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-secondary">
            {market ? `${market.city}, ${market.stateCode}` : 'Unknown market'} ·{' '}
            {PROPERTY_TYPE_LABEL[property.type]} · {property.bedrooms} bd ·{' '}
            {property.bathrooms} ba · {formatCurrency(property.monthlyRent)}/mo
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StagePill stage={pipeline.stage} />
            <DecisionPill classification={decision.classification} />
            {property.formerStr && <FormerStrBadge />}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <ScoreRing
            total={score.total}
            band={score.band}
            size={60}
            ariaLabel={`Advisory score ${score.total === null ? 'unavailable' : Math.round(score.total)} out of 100`}
          />
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-pressed={pipeline.saved}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_SAVED', propertyId: property.id })
                }
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  pipeline.saved
                    ? 'border-cyan/60 bg-cyan-soft text-cyan'
                    : 'border-line text-secondary hover:text-ink',
                )}
              >
                <Bookmark
                  className="h-3.5 w-3.5"
                  aria-hidden
                  fill={pipeline.saved ? 'currentColor' : 'none'}
                />
                {pipeline.saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                aria-pressed={inCompare}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_COMPARE', propertyId: property.id })
                }
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  inCompare
                    ? 'border-violet/60 bg-violet-soft text-violet'
                    : 'border-line text-secondary hover:text-ink',
                )}
              >
                <Columns2 className="h-3.5 w-3.5" aria-hidden />
                Compare
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Select
                label="Assignee"
                value={pipeline.assigneeId ?? ''}
                onChange={(e) =>
                  dispatch({
                    type: 'ASSIGN_PARTNER',
                    propertyId: property.id,
                    partnerId: (e.target.value || null) as
                      | 'partner-a'
                      | 'partner-b'
                      | null,
                  })
                }
              >
                <option value="">Unassigned</option>
                {PARTNER_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Stage"
                value={pipeline.stage}
                onChange={(e) =>
                  dispatch({
                    type: 'MOVE_STAGE',
                    propertyId: property.id,
                    stage: e.target.value as typeof pipeline.stage,
                  })
                }
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stageLabel(s.id)}
                  </option>
                ))}
              </Select>
            </div>
            <Link
              to={`/crm?property=${property.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open in CRM
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
