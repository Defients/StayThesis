import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, Search, Scale } from 'lucide-react';
import type { Market } from '@/domain/types';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { MARKETS } from '@/data/demo/markets';
import { PROPERTIES } from '@/data/demo/properties';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScatterChart } from '@/components/charts/ScatterChart';
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatRatio,
} from '@/lib/format';
import { cx } from '@/lib/cx';
import { MarketDetailPanel } from './MarketDetailPanel';
import { MarketMap } from './MarketMap';
import {
  CONFIDENCE_TONE,
  REGULATORY_LABEL,
  REGULATORY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from './marketTones';

type SortKey =
  | 'city'
  | 'status'
  | 'adr'
  | 'occupancy'
  | 'revenue'
  | 'rent'
  | 'revRent'
  | 'regulatory'
  | 'confidence'
  | 'candidates';

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'adr', label: 'Modeled ADR', numeric: true },
  { key: 'occupancy', label: 'Occupancy', numeric: true },
  { key: 'revenue', label: 'Modeled rev/mo', numeric: true },
  { key: 'rent', label: 'Median 2BR rent', numeric: true },
  { key: 'revRent', label: 'Rev ÷ rent', numeric: true },
  { key: 'regulatory', label: 'Regulatory' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'candidates', label: 'Candidates', numeric: true },
];

const candidateCount = (marketId: string) =>
  PROPERTIES.filter((p) => p.marketId === marketId).length;

const sortValue = (m: Market, key: SortKey): string | number => {
  switch (key) {
    case 'city':
      return m.city;
    case 'status':
      return m.status;
    case 'adr':
      return m.metrics.adr;
    case 'occupancy':
      return m.metrics.occupancyRate;
    case 'revenue':
      return m.metrics.modeledMonthlyRevenue;
    case 'rent':
      return m.metrics.medianRent2br;
    case 'revRent':
      return m.metrics.modeledMonthlyRevenue / m.metrics.medianRent2br;
    case 'regulatory':
      return m.regulatoryStatus;
    case 'confidence':
      return m.researchConfidence;
    case 'candidates':
      return candidateCount(m.id);
  }
};

const MARKET_COMPARE_LIMIT = 3;

export default function MarketsPage() {
  useDocumentTitle('Market Intelligence — StayThesis');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('market');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [compare, setCompare] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MARKETS.filter(
      (m) =>
        !q ||
        `${m.city} ${m.state}`.toLowerCase().includes(q),
    );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number')
        return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [query, sortKey, sortDir]);

  const selected = MARKETS.find((m) => m.id === selectedId) ?? null;
  const candidates = selected
    ? PROPERTIES.filter((p) => p.marketId === selected.id)
    : [];

  const setSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'city' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const selectMarket = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('market', id);
    else next.delete('market');
    setSearchParams(next, { replace: true });
  };

  const toggleCompare = (id: string) =>
    setCompare((c) =>
      c.includes(id)
        ? c.filter((x) => x !== id)
        : c.length < MARKET_COMPARE_LIMIT
          ? [...c, id]
          : c,
    );

  return (
    <>
      <PageHeader
        index="02"
        title="Market Intelligence"
        description="Synthetic market research — modeled ADR, occupancy, seasonality, and regulatory posture. All figures Modeled (demo)."
      />

      <div className="flex flex-col gap-5">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets…"
            aria-label="Search markets"
            className="h-9 w-full rounded-lg border border-line bg-sunken pl-9 pr-3 text-sm text-ink placeholder:text-muted"
          />
        </div>

        {/* Stacked cards below md — the 10-column table does not fit phones. */}
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map((m) => {
            const isSelected = m.id === selectedId;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => selectMarket(isSelected ? null : m.id)}
                  aria-pressed={isSelected}
                  className={cx(
                    'w-full rounded-xl border bg-surface p-4 text-left transition-colors',
                    isSelected
                      ? 'border-cyan/60 bg-elevated/60'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-ink">
                      {m.city}
                      <span className="ml-1 text-xs font-normal text-muted">{m.stateCode}</span>
                    </span>
                    <StatusPill tone={STATUS_TONE[m.status]}>
                      {STATUS_LABEL[m.status]}
                    </StatusPill>
                  </span>
                  <span className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {(
                      [
                        ['ADR', formatCurrency(m.metrics.adr)],
                        ['Occupancy', formatPercent(m.metrics.occupancyRate)],
                        ['Rev ÷ rent', formatRatio(m.metrics.modeledMonthlyRevenue / m.metrics.medianRent2br)],
                      ] as const
                    ).map(([k, v]) => (
                      <span key={k}>
                        <span className="block text-[10px] font-medium uppercase tracking-wider text-muted">{k}</span>
                        <span className="block text-sm font-semibold text-ink tabular-nums">{v}</span>
                      </span>
                    ))}
                  </span>
                  <span className="mt-3 block">
                    <StatusPill tone={REGULATORY_TONE[m.regulatoryStatus]}>
                      {REGULATORY_LABEL[m.regulatoryStatus]}
                    </StatusPill>
                  </span>
                </button>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
              No markets match “{query}”.
            </li>
          )}
        </ul>

        {/* Sortable table */}
        <Panel className="hidden overflow-hidden md:block" flush>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[880px] text-sm">
              <caption className="sr-only">
                Demo market metrics, sortable by column
              </caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="w-10 px-3 py-2.5" aria-label="Compare" />
                  {COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        aria-sort={
                          active
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                        className={cx(
                          'px-3 py-2.5 font-medium',
                          col.numeric && 'text-right',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSort(col.key)}
                          className={cx(
                            'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors',
                            active ? 'text-cyan' : 'text-secondary hover:text-ink',
                          )}
                        >
                          {col.label}
                          {active &&
                            (sortDir === 'asc' ? (
                              <ArrowUp className="h-3 w-3" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3 w-3" aria-hidden />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const count = candidateCount(m.id);
                  const isSelected = m.id === selectedId;
                  return (
                    <tr
                      key={m.id}
                      aria-selected={isSelected}
                      onClick={() => selectMarket(isSelected ? null : m.id)}
                      className={cx(
                        'cursor-pointer border-b border-line/60 transition-colors last:border-0',
                        isSelected ? 'bg-elevated/70' : 'hover:bg-elevated/40',
                      )}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Compare ${m.city}`}
                          checked={compare.includes(m.id)}
                          disabled={
                            !compare.includes(m.id) &&
                            compare.length >= MARKET_COMPARE_LIMIT
                          }
                          onChange={() => toggleCompare(m.id)}
                          className="h-4 w-4 accent-[#31b8d2]"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-ink">
                        {m.city}
                        <span className="ml-1 text-xs font-normal text-muted">
                          {m.stateCode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={STATUS_TONE[m.status]}>
                          {STATUS_LABEL[m.status]}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {formatCurrency(m.metrics.adr)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {formatPercent(m.metrics.occupancyRate)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {formatCurrency(m.metrics.modeledMonthlyRevenue)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-secondary">
                        {formatCurrency(m.metrics.medianRent2br)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                        {formatRatio(
                          m.metrics.modeledMonthlyRevenue / m.metrics.medianRent2br,
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={REGULATORY_TONE[m.regulatoryStatus]}>
                          {REGULATORY_LABEL[m.regulatoryStatus]}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={CONFIDENCE_TONE[m.researchConfidence]}>
                          {m.researchConfidence}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-secondary">
                        {count}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-sm text-muted">
                      No markets match “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Market compare panel */}
        {compare.length > 0 && (
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-cyan" aria-hidden />
                Market comparison ({compare.length}/{MARKET_COMPARE_LIMIT})
              </span>
            }
            actions={
              <button
                type="button"
                className="text-xs font-medium text-secondary hover:text-ink"
                onClick={() => setCompare([])}
              >
                Clear
              </button>
            }
          >
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${compare.length}, minmax(0,1fr))` }}
            >
              {compare.map((id) => {
                const m = MARKETS.find((x) => x.id === id)!;
                return (
                  <div key={id} className="rounded-lg border border-line bg-sunken/40 p-3">
                    <p className="mb-2 font-display text-sm font-semibold text-ink">
                      {m.city}, {m.stateCode}
                    </p>
                    <dl className="flex flex-col gap-1.5 text-xs">
                      {(
                        [
                          ['Status', STATUS_LABEL[m.status]],
                          ['Regulatory', REGULATORY_LABEL[m.regulatoryStatus]],
                          ['Modeled ADR', formatCurrency(m.metrics.adr)],
                          ['Occupancy', formatPercent(m.metrics.occupancyRate)],
                          ['Modeled rev/mo', formatCompactCurrency(m.metrics.modeledMonthlyRevenue)],
                          ['Median 2BR rent', formatCurrency(m.metrics.medianRent2br)],
                          ['Rev ÷ rent', formatRatio(m.metrics.modeledMonthlyRevenue / m.metrics.medianRent2br)],
                          ['Active listings', String(m.metrics.activeListings)],
                          ['Confidence', m.researchConfidence],
                          ['Candidates', String(candidateCount(m.id))],
                        ] as const
                      ).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-right font-medium text-ink tabular-nums">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Detail panel */}
        {selected && (
          <MarketDetailPanel
            market={selected}
            candidates={candidates}
            onClose={() => selectMarket(null)}
          />
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Occupancy vs ADR scatter */}
          <Panel title="Occupancy vs ADR — modeled (demo)">
            <ScatterChart
              data={MARKETS.map((m) => ({
                id: m.id,
                label: m.city,
                x: m.metrics.occupancyRate,
                y: m.metrics.adr,
                size: Math.max(0.7, Math.min(2, m.metrics.activeListings / 1800)),
                tone: m.status === 'active-research' ? 'cyan' : 'violet',
              }))}
              xLabel="Modeled occupancy"
              yLabel="Modeled ADR"
              xFormat={(v) => formatPercent(v, 0)}
              yFormat={(v) => formatCurrency(v)}
              selectedId={selectedId}
              onSelect={(id) => selectMarket(id)}
              ariaLabel="Scatter of modeled occupancy versus modeled ADR for each demo market; bubbles sized by active listings"
            />
            <p className="mt-2 text-[11px] text-muted">
              Bubble size ≈ active listings. Cyan = active research, violet = watchlist. Click a bubble for detail.
            </p>
          </Panel>

          {/* Illustrative map */}
          <Panel title="Market map — illustrative">
            <MarketMap markets={MARKETS} selectedId={selectedId} onSelect={selectMarket} />
          </Panel>
        </div>
      </div>
    </>
  );
}
