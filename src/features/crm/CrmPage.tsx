import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import type {
  AcquisitionStage,
  ApprovalDecision,
  MarketId,
  PartnerId,
} from '@/domain/types';
import { STAGES } from '@/domain/crm/stages';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { usePropertyViews } from '@/app/store/selectors';
import { MARKETS } from '@/data/demo/markets';
import { propertyById } from '@/data/demo/properties';
import { PARTNERS, PARTNER_LIST } from '@/data/demo/partners';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Checkbox';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatCurrency } from '@/lib/format';
import { cx } from '@/lib/cx';
import { CrmCard, DRAG_MIME } from './CrmCard';
import { CrmDrawer } from './CrmDrawer';

type AssigneeFilter = 'all' | PartnerId | 'unassigned';

const DECISION_TONE: Record<ApprovalDecision, 'positive' | 'critical' | 'warning'> = {
  APPROVED: 'positive',
  DECLINED: 'critical',
  PENDING: 'warning',
};

export default function CrmPage() {
  const views = usePropertyViews();
  const store = useStore();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState<AssigneeFilter>('all');
  const [marketId, setMarketId] = useState<'all' | MarketId>('all');
  const [hideRejected, setHideRejected] = useState(false);
  const [dragOver, setDragOver] = useState<AcquisitionStage | null>(null);

  const openId = searchParams.get('property');
  const openView = useMemo(
    () => views.find((v) => v.property.id === openId) ?? null,
    [views, openId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return views.filter((v) => {
      if (hideRejected && v.pipeline.stage === 'rejected') return false;
      if (assignee === 'unassigned' && v.pipeline.assigneeId !== null)
        return false;
      if (
        assignee !== 'all' &&
        assignee !== 'unassigned' &&
        v.pipeline.assigneeId !== assignee
      )
        return false;
      if (marketId !== 'all' && v.property.marketId !== marketId) return false;
      if (
        q &&
        !`${v.property.name} ${v.property.code} ${v.market?.city ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [views, query, assignee, marketId, hideRejected]);

  const byStage = useMemo(() => {
    const map = new Map<AcquisitionStage, typeof filtered>();
    for (const s of STAGES) map.set(s.id, []);
    for (const v of filtered) map.get(v.pipeline.stage)?.push(v);
    return map;
  }, [filtered]);

  const moveTo = (propertyId: string, stage: AcquisitionStage) =>
    dispatch({ type: 'MOVE_STAGE', propertyId, stage });

  const jumpToStage = (stage: AcquisitionStage) =>
    document
      .getElementById(`crm-col-${stage}`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('property');
    setSearchParams(next, { replace: true });
  };

  const usedMarkets = useMemo(
    () => MARKETS.filter((m) => views.some((v) => v.property.marketId === m.id)),
    [views],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        index="05"
        title="Acquisition CRM"
        description="Deal pipeline — synthetic demo records, not real outreach."
      />

      {/* Filters ----------------------------------------------------------- */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="crm-search"
            className="text-xs font-medium text-secondary"
          >
            Search
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              id="crm-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, code or city…"
              className="h-9 w-52 rounded-lg border border-line bg-sunken pl-8 pr-3 text-sm text-ink placeholder:text-muted"
            />
          </div>
        </div>
        <Select
          label="Assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value as AssigneeFilter)}
          className="w-40"
        >
          <option value="all">All</option>
          {PARTNER_LIST.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="unassigned">Unassigned</option>
        </Select>
        <Select
          label="Market"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value as MarketId | 'all')}
          className="w-48"
        >
          <option value="all">All markets</option>
          {usedMarkets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.city}, {m.stateCode}
            </option>
          ))}
        </Select>
        <Toggle
          label="Hide rejected"
          checked={hideRejected}
          onChange={setHideRejected}
        />
        <Select
          label="Jump to stage"
          value=""
          onChange={(e) => {
            if (e.target.value) jumpToStage(e.target.value as AcquisitionStage);
            e.target.value = '';
          }}
          className="w-44 lg:hidden"
        >
          <option value="" disabled>
            Stage…
          </option>
          {STAGES.filter((s) => !hideRejected || s.id !== 'rejected').map(
            (s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ),
          )}
        </Select>
      </div>

      {/* Board ------------------------------------------------------------- */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-thin px-1 pb-2 lg:snap-none">
        {STAGES.filter((s) => !hideRejected || s.id !== 'rejected').map((s) => {
          const cards = byStage.get(s.id) ?? [];
          return (
            <section
              key={s.id}
              id={`crm-col-${s.id}`}
              data-stage={s.id}
              aria-label={`${s.label} — ${cards.length} ${cards.length === 1 ? 'property' : 'properties'}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOver(s.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setDragOver((d) => (d === s.id ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id =
                  e.dataTransfer.getData(DRAG_MIME) ||
                  e.dataTransfer.getData('text/plain');
                setDragOver(null);
                if (id) moveTo(id, s.id);
              }}
              className={cx(
                'flex w-[85vw] max-w-80 shrink-0 snap-center flex-col rounded-2xl border p-3 lg:w-72',
                dragOver === s.id
                  ? 'border-cyan/50 bg-cyan/5'
                  : 'border-line bg-sunken/50',
              )}
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  {s.label}
                </h2>
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold tabular-nums text-secondary">
                  {cards.length}
                </span>
              </header>
              <div className="flex-1 space-y-2.5">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11px] text-muted">
                    Drop properties here
                  </p>
                ) : (
                  cards.map((v) => (
                    <CrmCard
                      key={v.property.id}
                      view={v}
                      onOpen={(id) => {
                        const next = new URLSearchParams(searchParams);
                        next.set('property', id);
                        setSearchParams(next);
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Approvals panel --------------------------------------------------- */}
      <Panel
        title="Approvals"
        className="mt-2"
        actions={
          <span className="text-[10px] text-muted">
            Material financial commitments require approval from both partners.
            Simulated — not authenticated.
          </span>
        }
      >
        {store.approvals.length === 0 ? (
          <p className="text-sm text-muted">
            No approval requests. Request one from a property drawer.
          </p>
        ) : (
          <ul className="space-y-2">
            {store.approvals.map((a) => {
              const property = propertyById(a.propertyId);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-sunken/60 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {a.title}
                    </p>
                    <p className="text-xs text-muted">
                      <Link
                        to={`/crm?property=${a.propertyId}`}
                        className="text-cyan underline decoration-cyan/50 underline-offset-2 hover:decoration-cyan"
                      >
                        {property?.name ?? a.propertyId}
                      </Link>{' '}
                      · {formatCurrency(a.amount)} · requested by{' '}
                      {PARTNERS[a.requestedBy].name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {PARTNER_LIST.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted">
                          {p.initials}
                        </span>
                        <StatusPill tone={DECISION_TONE[a.decisions[p.id]]}>
                          {a.decisions[p.id] === 'APPROVED'
                            ? 'Approved'
                            : a.decisions[p.id] === 'DECLINED'
                              ? 'Declined'
                              : 'Pending'}
                        </StatusPill>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {openView && <CrmDrawer view={openView} onClose={closeDrawer} />}
    </div>
  );
}
