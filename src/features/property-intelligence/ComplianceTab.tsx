import { Link } from 'react-router';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ChecklistItem, GateStatus } from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { PARTNERS } from '@/data/demo/partners';
import { GateStatusPill } from '@/components/property/pills';
import { Checkbox } from '@/components/ui/Checkbox';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';
import { cx } from '@/lib/cx';

const GATE_OPTIONS: { value: GateStatus; label: string }[] = [
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
  { value: 'NEEDS_VERIFICATION', label: 'Needs verification' },
  { value: 'NOT_APPLICABLE', label: 'N/A' },
];

const GROUP_ORDER: ChecklistItem['group'][] = [
  'regulatory',
  'lease',
  'safety',
  'insurance',
  'operations',
];
const GROUP_LABEL: Record<ChecklistItem['group'], string> = {
  regulatory: 'Regulatory',
  lease: 'Lease & landlord',
  safety: 'Safety',
  insurance: 'Insurance',
  operations: 'Operations',
};

const BANNER_TONE: Record<PropertyView['decision']['classification'], string> = {
  QUALIFIED: 'border-positive/40 bg-positive-soft/30 text-positive',
  RESEARCH_CANDIDATE: 'border-cyan/40 bg-cyan-soft/30 text-cyan',
  HOLD_UNRESOLVED: 'border-warning/40 bg-warning-soft/30 text-warning',
  BLOCKED: 'border-critical/40 bg-critical-soft/30 text-critical',
  REJECTED: 'border-line bg-elevated/60 text-secondary',
};

function GateStatusControl({
  value,
  disabled,
  onChange,
  label,
}: {
  value: GateStatus;
  disabled: boolean;
  onChange: (s: GateStatus) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex rounded-lg border border-line p-0.5',
        disabled && 'opacity-45',
      )}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const idx = GATE_OPTIONS.findIndex((o) => o.value === value);
        const next =
          (idx + (e.key === 'ArrowRight' ? 1 : GATE_OPTIONS.length - 1)) %
          GATE_OPTIONS.length;
        onChange(GATE_OPTIONS[next]!.value);
      }}
    >
      {GATE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cx(
            'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? opt.value === 'FAIL'
                ? 'bg-critical text-white'
                : opt.value === 'PASS'
                  ? 'bg-positive text-[#062b16]'
                  : 'bg-elevated text-ink'
              : 'text-secondary hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ComplianceTab({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const checklist = useStore().checklist.filter(
    (c) => c.propertyId === view.property.id,
  );
  const { decision } = view;
  const blocked = decision.classification === 'BLOCKED';

  return (
    <div className="flex flex-col gap-5">
      <div
        role="status"
        className={cx(
          'flex items-center gap-3 rounded-xl border px-4 py-3',
          BANNER_TONE[decision.classification],
        )}
      >
        {blocked ? (
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <div>
          <p className="text-sm font-semibold">{decision.headline}</p>
          <p className="text-xs opacity-80">
            {decision.canQualify
              ? 'Can be moved to Qualified.'
              : `Cannot qualify: ${decision.failed.length} failed, ${decision.unresolved.length} unresolved.`}
          </p>
        </div>
      </div>

      <Panel title="Critical gates" flush className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-line">
          {view.gates.map((gate) => {
            const calculated = gate.mode === 'calculated';
            return (
              <li
                key={gate.category}
                className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:gap-6"
              >
                <div className="min-w-0 lg:w-72 lg:shrink-0">
                  <p className="text-sm font-medium text-ink">{gate.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill
                      tone={calculated ? 'violet' : 'neutral'}
                      className="normal-case"
                    >
                      {calculated ? 'Calculated' : 'Manual'}
                    </StatusPill>
                    <GateStatusPill status={gate.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {gate.updatedBy === 'system'
                      ? 'System'
                      : (PARTNERS[gate.updatedBy as keyof typeof PARTNERS]
                          ?.name ?? gate.updatedBy)}{' '}
                    · {gate.updatedAt.slice(0, 10)}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  {calculated ? (
                    <div className="flex flex-col gap-2">
                      <GateStatusControl
                        value={gate.status}
                        disabled
                        onChange={() => {}}
                        label={`${gate.label} (calculated)`}
                      />
                      <p className="text-xs text-secondary">
                        {gate.note || 'Derived from the underwriting model.'}{' '}
                        <Link
                          to={`/property/${view.property.id}/underwriting`}
                          className="inline-flex items-center gap-0.5 font-medium text-cyan hover:underline"
                        >
                          Driven by underwriting
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </p>
                      <p className="text-[11px] text-muted">
                        Calculated gates cannot be edited — change the inputs on
                        the Underwriting tab.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <GateStatusControl
                        value={gate.status}
                        disabled={false}
                        onChange={(status) =>
                          dispatch({
                            type: 'SET_GATE_STATUS',
                            propertyId: view.property.id,
                            category: gate.category,
                            status,
                          })
                        }
                        label={gate.label}
                      />
                      <label className="block">
                        <span className="sr-only">Note for {gate.label}</span>
                        <input
                          type="text"
                          key={`${gate.category}-${gate.updatedAt}`}
                          defaultValue={gate.note}
                          placeholder="Verification note…"
                          onBlur={(e) => {
                            if (e.target.value !== gate.note)
                              dispatch({
                                type: 'SET_GATE_NOTE',
                                propertyId: view.property.id,
                                category: gate.category,
                                note: e.target.value,
                              });
                          }}
                          className="h-9 w-full rounded-lg border border-line bg-sunken px-3 text-sm text-ink placeholder:text-muted"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Verification checklist">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GROUP_ORDER.map((group) => {
            const items = checklist.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <fieldset key={group}>
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {GROUP_LABEL[group]}
                </legend>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Checkbox
                        label={item.label}
                        checked={item.done}
                        onChange={() =>
                          dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', id: item.id })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
        </div>
        <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted">
          Prototype checklist. Actual legal clearance requires human
          verification with the municipality, landlord, HOA and insurer.
        </p>
      </Panel>
    </div>
  );
}
