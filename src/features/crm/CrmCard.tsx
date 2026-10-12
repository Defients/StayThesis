import { AlertTriangle, CheckSquare, Stamp } from 'lucide-react';
import type { PartnerId, PropertyId } from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import { STAGES } from '@/domain/crm/stages';
import { PARTNERS } from '@/data/demo/partners';
import { marketById } from '@/data/demo/markets';
import { DecisionPill } from '@/components/property/pills';
import { useDispatch } from '@/app/store/StoreContext';
import { formatCurrency } from '@/lib/format';
import { cx } from '@/lib/cx';

export const DRAG_MIME = 'application/x-staythesis-property';

/**
 * Kanban card — draggable on desktop, with an always-present "Move to…"
 * select for keyboard and touch. Both paths dispatch MOVE_STAGE; refused
 * moves surface through the store notice and the card stays put.
 */
export function CrmCard({
  view,
  onOpen,
}: {
  view: PropertyView;
  onOpen: (id: PropertyId) => void;
}) {
  const dispatch = useDispatch();
  const { property, pipeline, decision } = view;
  const market = marketById(property.marketId);
  const baseAfterFin = view.results.base.monthlyAverage.afterFinancingCashFlow;
  const openTasks = view.tasks.filter((t) => !t.done).length;
  const pendingApproval = view.approvals.some((a) =>
    Object.values(a.decisions).includes('PENDING'),
  );
  const gateRegression =
    pipeline.stage === 'qualified' && !decision.canQualify;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, property.id);
        e.dataTransfer.setData('text/plain', property.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(property.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(property.id);
        }
      }}
      className={cx(
        'group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card',
        'transition-colors hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan',
        'active:cursor-grabbing',
      )}
      aria-label={`${property.name} — ${market?.city ?? ''}, stage ${pipeline.stage}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {property.code}
          </p>
          <p className="truncate text-sm font-semibold text-ink">
            {property.name}
          </p>
          <p className="text-xs text-secondary">
            {market?.city ?? '—'} · {formatCurrency(property.monthlyRent)}/mo
          </p>
        </div>
        <DecisionPill classification={decision.classification} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-secondary">
          Base after-financing{' '}
          <span
            className={cx(
              'font-semibold tabular-nums',
              baseAfterFin < 0 ? 'text-critical' : 'text-ink',
            )}
          >
            {formatCurrency(baseAfterFin)}/mo
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {openTasks > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-secondary"
              title={`${openTasks} open task${openTasks > 1 ? 's' : ''}`}
            >
              <CheckSquare aria-hidden className="h-3 w-3" />
              {openTasks}
            </span>
          )}
          {pendingApproval && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning"
              title="Approval pending"
            >
              <Stamp aria-hidden className="h-3 w-3" />
              Approval
            </span>
          )}
          {pipeline.assigneeId ? (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 text-[10px] font-bold text-ink"
              title={`Assigned to ${PARTNERS[pipeline.assigneeId].name}`}
            >
              {PARTNERS[pipeline.assigneeId as PartnerId].initials}
            </span>
          ) : (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-line text-[10px] text-muted"
              title="Unassigned"
            >
              —
            </span>
          )}
        </div>
      </div>

      {gateRegression && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-2 py-1 text-[11px] font-medium text-critical">
          <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" />
          Gate regression — no longer qualifies
        </p>
      )}

      <label
        className="mt-2 block text-[11px] text-muted"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        Move to…
        <select
          value={pipeline.stage}
          onChange={(e) => {
            const stage = e.target.value as typeof pipeline.stage;
            if (stage !== pipeline.stage)
              dispatch({ type: 'MOVE_STAGE', propertyId: property.id, stage });
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-8 w-full rounded-lg border border-line bg-sunken px-2 text-xs text-ink"
          aria-label={`Move ${property.name} to stage`}
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
