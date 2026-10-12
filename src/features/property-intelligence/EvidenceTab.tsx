import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import type {
  EvidenceClassification,
  EvidenceHistoryState,
  EvidenceRecord,
} from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import { useActingPartner, useDispatch } from '@/app/store/StoreContext';
import { PARTNERS } from '@/data/demo/partners';
import { gateLabel } from '@/domain/compliance';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { Stat } from '@/components/ui/Stat';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { cx } from '@/lib/cx';
import { EvidenceCaptureForm } from './EvidenceCaptureForm';

const CLASSIFICATIONS: EvidenceClassification[] = [
  'VERIFIED',
  'CALCULATED',
  'ESTIMATED',
  'UNVERIFIED',
  'OPERATOR_CLAIM',
];

const CLASS_TONE: Record<EvidenceClassification, StatusTone> = {
  VERIFIED: 'positive',
  CALCULATED: 'cyan',
  ESTIMATED: 'violet',
  UNVERIFIED: 'warning',
  OPERATOR_CLAIM: 'neutral',
};

const CLASS_LABEL: Record<EvidenceClassification, string> = {
  VERIFIED: 'Verified',
  CALCULATED: 'Calculated',
  ESTIMATED: 'Estimated',
  UNVERIFIED: 'Unverified',
  OPERATOR_CLAIM: 'Operator claim',
};

const HISTORY_STATES: EvidenceHistoryState[] = [
  'CURRENT',
  'STALE',
  'SUPERSEDED',
  'DISPUTED',
  'INCORRECT',
];

/** Human-readable names for seed metric keys; camelCase/kebab falls back. */
const METRIC_LABEL: Record<string, string> = {
  monthlyRent: 'Monthly rent',
  adr: 'Modeled ADR',
  occupancy: 'Modeled occupancy',
  projectedRevenue: 'Projected annual revenue',
  'permit-eligibility': 'Permit eligibility',
  'landlord-consent': 'Landlord consent',
};

function metricLabel(metric: string): string {
  return (
    METRIC_LABEL[metric] ??
    metric
      .replace(/[-_]/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

const UNITS_SUFFIX: Record<string, string> = {
  'USD/year': '/yr',
  'USD/month': '/mo',
  'USD/night': '/night',
};

function evidenceValue(record: EvidenceRecord): string {
  const { value, units } = record;
  if (typeof value === 'number') {
    if (units && units in UNITS_SUFFIX)
      return `${formatCurrency(value)} ${UNITS_SUFFIX[units]}`;
    if (units === 'fraction') return formatPercent(value);
    if (units) return `${value} ${units}`;
    return String(value);
  }
  return units ? `${value} ${units}` : String(value);
}

function EvidenceCard({
  record,
  actingName,
  onPatch,
}: {
  record: EvidenceRecord;
  actingName: string;
  onPatch: (
    patch: Partial<
      Pick<
        EvidenceRecord,
        'classification' | 'reviewStatus' | 'historyState' | 'notes'
      >
    >,
  ) => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {metricLabel(record.metric)}
            <span className="ml-2 font-display text-base tabular-nums">
              {evidenceValue(record)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-secondary">{record.definition}</p>
        </div>
        <StatusPill tone={CLASS_TONE[record.classification]}>
          {CLASS_LABEL[record.classification]}
        </StatusPill>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {(
          [
            ['History', record.historyState],
            [
              'Review',
              record.reviewer
                ? `${record.reviewStatus} · ${PARTNERS[record.reviewer].name}`
                : record.reviewStatus,
            ],
            ['Source', record.sourceName],
            [
              'Source URL',
              record.sourceUrl ?? 'No source URL (demo)',
            ],
            ['Retrieved', record.retrievedAt?.slice(0, 10) ?? '—'],
            ['Effective', record.effectiveAt?.slice(0, 10) ?? '—'],
            ['Period', record.observationPeriod ?? '—'],
            [
              'Linked gate',
              record.gateCategory ? gateLabel(record.gateCategory) : '—',
            ],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {k}
            </dt>
            <dd className="mt-0.5 text-secondary">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3">
        <Select
          label="Classification"
          value={record.classification}
          onChange={(e) =>
            onPatch({ classification: e.target.value as EvidenceClassification })
          }
          className="w-44"
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {CLASS_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select
          label="History state"
          value={record.historyState}
          onChange={(e) =>
            onPatch({ historyState: e.target.value as EvidenceHistoryState })
          }
          className="w-40"
        >
          {HISTORY_STATES.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          disabled={record.reviewStatus === 'REVIEWED'}
          onClick={() => onPatch({ reviewStatus: 'REVIEWED' })}
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden />
          {record.reviewStatus === 'REVIEWED'
            ? `Reviewed by ${record.reviewer ? PARTNERS[record.reviewer].name : actingName}`
            : `Mark reviewed as ${actingName}`}
        </Button>
        <label className="min-w-48 flex-1">
          <span className="text-xs font-medium text-secondary">Note</span>
          <input
            type="text"
            key={`${record.id}-${record.audit.length}`}
            defaultValue={record.notes}
            placeholder="Analyst note…"
            onBlur={(e) => {
              if (e.target.value !== record.notes)
                onPatch({ notes: e.target.value });
            }}
            className="mt-1 h-9 w-full rounded-lg border border-line bg-sunken px-3 text-sm text-ink placeholder:text-muted"
          />
        </label>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-secondary">
          Audit history ({record.audit.length})
        </summary>
        <ul className="mt-2 flex flex-col gap-1 border-l-2 border-line pl-3">
          {record.audit.map((a, i) => (
            <li key={i} className="text-xs text-muted">
              <span className="tabular-nums">{a.at.slice(0, 16).replace('T', ' ')}</span>
              {' · '}
              {a.actor === 'system' ? 'System' : (PARTNERS[a.actor as keyof typeof PARTNERS]?.name ?? a.actor)}
              {' — '}
              <span className="text-secondary">{a.action}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function EvidenceTab({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const { actingPartner } = useActingPartner();
  const [filter, setFilter] = useState<EvidenceClassification | 'all'>('all');
  const records = view.evidence.filter(
    (e) => filter === 'all' || e.classification === filter,
  );
  const confidence = view.score.factors.evidenceConfidence;

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Evidence ledger"
        actions={
          <Stat
            label="Evidence confidence factor"
            value={`${Math.round(confidence)} / 100`}
          />
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-secondary">Legend:</span>
          {CLASSIFICATIONS.map((c) => (
            <StatusPill key={c} tone={CLASS_TONE[c]}>
              {CLASS_LABEL[c]}
            </StatusPill>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-3">
          <Select
            label="Filter by classification"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as EvidenceClassification | 'all')
            }
            className="w-56"
          >
            <option value="all">All classifications</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {CLASS_LABEL[c]}
              </option>
            ))}
          </Select>
          <p className="mt-5 text-xs text-muted">
            {records.length} of {view.evidence.length} records · classification
            is never auto-upgraded — VERIFIED requires human review.
          </p>
        </div>
        <EvidenceCaptureForm propertyId={view.property.id} />
        <ul className={cx('flex flex-col gap-3')}>
          {records.map((record) => (
            <EvidenceCard
              key={record.id}
              record={record}
              actingName={actingPartner.name}
              onPatch={(patch) =>
                dispatch({ type: 'UPDATE_EVIDENCE', id: record.id, patch })
              }
            />
          ))}
          {records.length === 0 && (
            <li className="rounded-xl border border-line px-4 py-8 text-center text-sm text-muted">
              No records in this classification.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
