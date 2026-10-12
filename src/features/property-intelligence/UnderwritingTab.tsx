import { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type {
  BreakEvenResult,
  FinanceWarning,
  PlanningPreferences,
  ScenarioAssumptions,
  ScenarioKey,
  ScenarioResult,
} from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import {
  FINANCING_FIELDS,
  MODEL_FIELDS,
  PREFERENCE_LABELS,
  SCENARIO_FIELDS,
  SCENARIO_LABELS,
  STARTUP_FIELDS,
} from '@/app/store/fieldMeta';
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatRatio,
} from '@/lib/format';
import { formatScreeningValue } from '@/lib/screeningFormat';
import { cx } from '@/lib/cx';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import { Unavailable } from '@/components/ui/Unavailable';
import { BarChart, MONTH_LABELS } from '@/components/charts/BarChart';

const SCENARIOS: ScenarioKey[] = ['base', 'upside', 'conservative', 'stress'];
/** Comparison table column order — Base emphasized in the middle-left slot. */
const COMPARE_ORDER: ScenarioKey[] = [
  'upside',
  'base',
  'conservative',
  'stress',
];

const REVENUE_FIELDS: (keyof ScenarioAssumptions)[] = [
  'adr',
  'occupancyRate',
  'averageLengthOfStay',
  'cleaningFeePerStay',
  'ancillaryRevenuePerStay',
  'discountRate',
];
const FEE_FIELDS: (keyof ScenarioAssumptions)[] = [
  'platformFeeRate',
  'paymentProcessingRate',
  'occupancyTaxRate',
];
const FIXED_FIELDS: (keyof ScenarioAssumptions)[] = [
  'rent',
  'utilities',
  'internet',
  'insurance',
  'software',
  'maintenance',
  'furnitureReplacement',
  'permitLicense',
  'otherFixed',
];
const TURNOVER_FIELDS: (keyof ScenarioAssumptions)[] = [
  'cleaningCostPerTurnover',
  'laundryCostPerTurnover',
  'suppliesPerTurnover',
];
const STARTUP_ORDER = [
  'firstMonthRent',
  'securityDeposit',
  'furnishing',
  'equipment',
  'locks',
  'supplies',
  'photography',
  'permitSetup',
  'contingency',
] as const;
const FINANCING_ORDER = [
  'creditFundedAmount',
  'upfrontFeeRate',
  'promoApr',
  'promoMonths',
  'postPromoApr',
  'plannedRepaymentMonths',
] as const;

const PCT_FIELDS = new Set<keyof ScenarioAssumptions>([
  'occupancyRate',
  'discountRate',
  'platformFeeRate',
  'paymentProcessingRate',
  'occupancyTaxRate',
]);
const PCT_FINANCING = new Set(['upfrontFeeRate', 'promoApr', 'postPromoApr']);

const WARNING_TEXT: Record<FinanceWarning, string> = {
  'invalid-input-sanitized': 'Some inputs were sanitized back into valid ranges.',
  'invalid-length-of-stay': 'Average length of stay was adjusted to at least one night.',
  'credit-exceeds-eligible': 'Requested credit exceeds the credit-eligible startup amount.',
  'promo-balance-remaining':
    'Planned payments leave a balance when the promotional period ends — the post-promo APR will apply.',
  'payoff-not-reached': 'Planned payments do not clear the balance within 120 months.',
};

const money0 = (v: number) => formatCurrency(v);
const signed = (v: number) => v < 0;

function breakEvenText(b: BreakEvenResult): string {
  if (b.status === 'always') return 'Always';
  if (b.status === 'not-achievable' || b.occupancy === null)
    return 'Not achievable ≤100%';
  return formatPercent(b.occupancy);
}

export function UnderwritingTab({ view }: { view: PropertyView }) {
  const dispatch = useDispatch();
  const preferences = useStore().preferences;
  const [scenario, setScenario] = useState<ScenarioKey>('base');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const { model, results } = view;
  const selected = results[scenario];
  const fin = selected.financing;
  const cap = selected.capital;

  const update = (field: keyof ScenarioAssumptions) => (value: number) =>
    dispatch({
      type: 'UPDATE_SCENARIO_FIELD',
      propertyId: view.property.id,
      scenario,
      field,
      value: PCT_FIELDS.has(field) ? value / 100 : value,
    });

  const fieldValue = (field: keyof ScenarioAssumptions) => {
    const v = model.scenarios[scenario][field];
    return PCT_FIELDS.has(field) ? v * 100 : v;
  };

  const numField = (
    field: keyof ScenarioAssumptions,
    opts: { step?: number; max?: number; hint?: string } = {},
  ) => (
    <NumberField
      key={`${scenario}-${field}`}
      label={SCENARIO_FIELDS[field].label}
      value={fieldValue(field)}
      onChange={update(field)}
      prefix={PCT_FIELDS.has(field) ? undefined : '$'}
      suffix={PCT_FIELDS.has(field) ? '%' : undefined}
      min={0}
      max={opts.max ?? (PCT_FIELDS.has(field) ? 100 : undefined)}
      step={opts.step ?? (PCT_FIELDS.has(field) ? 1 : undefined)}
      hint={opts.hint}
    />
  );

  const ComparisonRow = ({
    label,
    children,
  }: {
    label: string;
    children: (r: ScenarioResult) => React.ReactNode;
  }) => (
    <tr className="border-b border-line/60 last:border-0">
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-44 bg-surface px-4 py-2.5 text-left text-sm font-medium text-secondary shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]"
      >
        {label}
      </th>
      {COMPARE_ORDER.map((s) => (
        <td
          key={s}
          className={cx(
            'px-4 py-2.5 text-right text-sm text-ink',
            s === 'base' && 'bg-elevated/40',
          )}
        >
          {children(results[s])}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1 — Scenario comparison */}
      <Panel
        title="Scenario comparison"
        flush
        className="overflow-hidden"
      >
        <div className="relative">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="sticky left-0 z-10 min-w-44 bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">
                    Metric
                  </th>
                  {COMPARE_ORDER.map((s) => (
                    <th
                      key={s}
                      className={cx(
                        'px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider',
                        s === 'base'
                          ? 'bg-elevated/60 text-cyan'
                          : 'text-secondary',
                      )}
                    >
                      {SCENARIO_LABELS[s]}
                    </th>
                  ))}
                </tr>
              </thead>
            <tbody>
              <ComparisonRow label="Gross revenue / mo">
                {(r) => money0(r.monthlyAverage.grossBookingRevenue)}
              </ComparisonRow>
              <ComparisonRow label="Annual revenue">
                {(r) => money0(r.annual.grossBookingRevenue)}
              </ComparisonRow>
              <ComparisonRow label="Recurring expenses / mo">
                {(r) => money0(r.monthlyAverage.recurringExpenses)}
              </ComparisonRow>
              <ComparisonRow label="Operating cash flow / mo">
                {(r) => (
                  <span className={cx('tabular-nums', signed(r.monthlyAverage.operatingCashFlow) && 'text-critical')}>
                    {money0(r.monthlyAverage.operatingCashFlow)}
                  </span>
                )}
              </ComparisonRow>
              <ComparisonRow label="After-financing cash flow / mo">
                {(r) => (
                  <span className={cx('tabular-nums', signed(r.monthlyAverage.afterFinancingCashFlow) && 'text-critical')}>
                    {money0(r.monthlyAverage.afterFinancingCashFlow)}
                  </span>
                )}
              </ComparisonRow>
              <ComparisonRow label="Operating margin">
                {(r) =>
                  r.operatingMargin === null ? (
                    <Unavailable reason="No booking revenue — occupancy is 0%" />
                  ) : (
                    formatPercent(r.operatingMargin)
                  )
                }
              </ComparisonRow>
              <ComparisonRow label="Revenue ÷ rent">
                {(r) =>
                  r.revenueToRent === null ? (
                    <Unavailable reason="Rent is zero" />
                  ) : (
                    formatRatio(r.revenueToRent)
                  )
                }
              </ComparisonRow>
              <ComparisonRow label="Break-even occupancy">
                {(r) => (
                  <span className="block leading-snug">
                    <span className="block">{breakEvenText(r.breakEven.operating)} operating</span>
                    <span className="block text-muted">
                      {breakEvenText(r.breakEven.afterFinancing)} after financing
                    </span>
                  </span>
                )}
              </ComparisonRow>
              <ComparisonRow label="Cash-on-cash">
                {(r) =>
                  r.cashOnCash === null ? (
                    <Unavailable reason="No committed capital" />
                  ) : (
                    <span className="block leading-snug">
                      <span className="block">{formatPercent(r.cashOnCash)}</span>
                      <span className="block text-muted">
                        {r.cashOnCashExReserve === null
                          ? '—'
                          : `${formatPercent(r.cashOnCashExReserve)} ex-reserve`}
                      </span>
                    </span>
                  )
                }
              </ComparisonRow>
              <ComparisonRow label="Payback">
                {(r) =>
                  r.paybackMonths === null ? 'Not within 60 mo' : `${r.paybackMonths} mo`
                }
              </ComparisonRow>
              <ComparisonRow label="Taxes collected / yr (pass-through — not revenue)">
                {(r) => (
                  <span className="text-secondary">
                    {money0(r.annual.taxesCollectedPassThrough)}
                  </span>
                )}
              </ComparisonRow>
            </tbody>
          </table>
          </div>
          {/* Scroll affordance — visible cue that more columns exist. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent lg:hidden"
          />
          <p className="border-t border-line px-4 py-1.5 text-[10px] text-muted lg:hidden">
            Scroll for all four scenarios →
          </p>
        </div>
      </Panel>

      {/* 2 — Editor + selected scenario results */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel
          title={
            <span className="flex flex-wrap items-center gap-3">
              Assumptions
              <span
                role="radiogroup"
                aria-label="Scenario to edit"
                className="inline-flex rounded-lg border border-line p-0.5"
              >
                {SCENARIOS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={scenario === s}
                    onClick={() => setScenario(s)}
                    className={cx(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      scenario === s
                        ? 'bg-cyan text-[#06222b]'
                        : 'text-secondary hover:text-ink',
                    )}
                  >
                    {SCENARIO_LABELS[s]}
                  </button>
                ))}
              </span>
            </span>
          }
        >
          <div className="flex flex-col gap-5">
            <FieldGroup title="Revenue">
              {REVENUE_FIELDS.map((f) =>
                numField(f, {
                  max: f === 'occupancyRate' ? 100 : undefined,
                  step: f === 'averageLengthOfStay' ? 0.5 : undefined,
                }),
              )}
            </FieldGroup>
            <FieldGroup title="Fees & taxes">
              {FEE_FIELDS.map((f) => numField(f, { step: 0.5 }))}
            </FieldGroup>
            <FieldGroup title="Fixed monthly">{FIXED_FIELDS.map((f) => numField(f))}</FieldGroup>
            <FieldGroup title="Per turnover">{TURNOVER_FIELDS.map((f) => numField(f))}</FieldGroup>
            <FieldGroup title="Model (all scenarios)">
              <Select
                label="Launch month"
                value={String(model.launchMonth)}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_MODEL_FIELD',
                    propertyId: view.property.id,
                    field: 'launchMonth',
                    value: Number(e.target.value),
                  })
                }
              >
                {MONTH_LABELS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </Select>
              {(['reserveMonths', 'blockedNightsPerMonth'] as const).map((f) => (
                <NumberField
                  key={f}
                  label={MODEL_FIELDS[f].label}
                  value={model[f]}
                  onChange={(v) =>
                    dispatch({
                      type: 'UPDATE_MODEL_FIELD',
                      propertyId: view.property.id,
                      field: f,
                      value: v,
                    })
                  }
                  min={0}
                  max={f === 'blockedNightsPerMonth' ? 31 : 12}
                  step={1}
                />
              ))}
            </FieldGroup>
          </div>
        </Panel>

        <Panel
          title={`${SCENARIO_LABELS[scenario]} — 12-month projection`}
          className="lg:sticky lg:top-24"
        >
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {(
              [
                ['OCF / mo', money0(selected.monthlyAverage.operatingCashFlow)],
                ['After-fin / mo', money0(selected.monthlyAverage.afterFinancingCashFlow)],
                [
                  'Margin',
                  selected.operatingMargin === null
                    ? null
                    : formatPercent(selected.operatingMargin),
                ],
                [
                  'Rev ÷ rent',
                  selected.revenueToRent === null
                    ? null
                    : formatRatio(selected.revenueToRent),
                ],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {k}
                </dt>
                <dd className="font-display text-lg font-semibold text-ink tabular-nums">
                  {v === null ? (
                    <Unavailable reason="No booking revenue — occupancy is 0%" />
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <BarChart
            data={selected.monthly.map((m) => ({
              label: MONTH_LABELS[m.calendarMonth] ?? `M${m.projectionMonth}`,
              value: m.operatingCashFlow,
            }))}
            line={{
              label: 'After-financing cash flow',
              data: selected.monthly.map((m) => m.afterFinancingCashFlow),
            }}
            valueFormatter={(v) => formatCompactCurrency(v)}
            lineValueFormatter={(v) => formatCompactCurrency(v)}
            ariaLabel={`${SCENARIO_LABELS[scenario]} monthly operating cash flow bars with after-financing line`}
          />
          <p className="mt-1 text-[10px] text-muted">
            Bars: operating cash flow · Line: after-financing cash flow. Projection
            months 1–12 starting {MONTH_LABELS[model.launchMonth]}.
          </p>

          <details className="mt-4 rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              Monthly detail table
            </summary>
            <div className="overflow-x-auto scroll-thin border-t border-line">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-muted">
                    {[
                      'Month',
                      'Occ',
                      'ADR',
                      'Booked',
                      'Turns',
                      'Accom',
                      'Cleaning',
                      'Ancillary',
                      'Gross',
                      'Variable',
                      'Platform',
                      'Processing',
                      'Fixed',
                      'OCF',
                      'Debt',
                      'After-fin',
                    ].map((h) => (
                      <th key={h} className="px-2 py-2 font-medium first:pl-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.monthly.map((m) => (
                    <tr key={m.projectionMonth} className="border-b border-line/60 last:border-0">
                      <td className="px-2 py-1.5 pl-3 font-medium text-ink">
                        {MONTH_LABELS[m.calendarMonth]} M{m.projectionMonth}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {formatPercent(m.occupancyRate, 0)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.adr)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {m.bookedNights.toFixed(1)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {m.turnovers.toFixed(1)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.accommodationRevenue)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.cleaningFeesCollected)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.ancillaryRevenue)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                        {money0(m.grossBookingRevenue)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.cleaningExpense + m.laundryExpense + m.suppliesExpense)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.platformFees)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.processingFees)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.fixedExpenses)}
                      </td>
                      <td
                        className={cx(
                          'px-2 py-1.5 text-right tabular-nums',
                          m.operatingCashFlow < 0 ? 'text-critical' : 'text-ink',
                        )}
                      >
                        {money0(m.operatingCashFlow)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                        {money0(m.debtPayment)}
                      </td>
                      <td
                        className={cx(
                          'px-2 py-1.5 text-right tabular-nums font-medium',
                          m.afterFinancingCashFlow < 0 ? 'text-critical' : 'text-ink',
                        )}
                      >
                        {money0(m.afterFinancingCashFlow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>
      </div>

      {/* 3 — Startup & capital */}
      <Panel title="Startup & capital">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {STARTUP_ORDER.map((f) => (
              <NumberField
                key={f}
                label={STARTUP_FIELDS[f].label}
                value={model.startup[f]}
                onChange={(v) =>
                  dispatch({
                    type: 'UPDATE_STARTUP_FIELD',
                    propertyId: view.property.id,
                    field: f,
                    value: v,
                  })
                }
                prefix="$"
                min={0}
              />
            ))}
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            {(
              [
                ['Non-refundable startup', money0(cap.nonRefundableStartup), undefined],
                [
                  'Refundable deposit',
                  money0(cap.refundableDeposit),
                  'Cash requirement, not an expense',
                ],
                ['Startup cash requirement', money0(cap.startupCashRequirement), undefined],
                [
                  'Operating reserve',
                  money0(cap.operatingReserve),
                  `${model.reserveMonths} months of fixed obligations — allocated liquidity, not a cost`,
                ],
                ['Total committed capital', money0(cap.totalCommittedCapital), undefined],
                ['Credit-funded', money0(cap.creditFunded), undefined],
                ['Cash-funded', money0(cap.cashFunded), undefined],
                [
                  'Credit-eligible amount',
                  money0(cap.creditEligibleStartup),
                  'Rent, deposits and reserves are cash-only.',
                ],
              ] as const
            ).map(([k, v, note]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0"
              >
                <dt className="text-secondary">
                  {k}
                  {note && (
                    <span className="block text-[10px] text-muted">{note}</span>
                  )}
                </dt>
                <dd className="font-medium text-ink tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Panel>

      {/* 4 — Financing */}
      <Panel title="Financing — promotional credit">
        <p className="mb-4 rounded-lg border border-warning/30 bg-warning-soft/40 px-3 py-2 text-xs text-warning">
          A 0% promotional APR is not free capital. Financing approval is not
          assumed.
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {FINANCING_ORDER.map((f) => {
              const pct = PCT_FINANCING.has(f);
              return (
                <NumberField
                  key={f}
                  label={FINANCING_FIELDS[f].label}
                  value={pct ? model.financing[f] * 100 : model.financing[f]}
                  onChange={(v) =>
                    dispatch({
                      type: 'UPDATE_FINANCING_FIELD',
                      propertyId: view.property.id,
                      field: f,
                      value: pct ? v / 100 : v,
                    })
                  }
                  prefix={f === 'creditFundedAmount' ? '$' : undefined}
                  suffix={pct ? '%' : f.endsWith('Months') || f === 'plannedRepaymentMonths' ? 'mo' : undefined}
                  min={0}
                  step={1}
                />
              );
            })}
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            {(
              [
                ['Opening balance', money0(fin.openingBalance), false],
                ['Monthly payment', money0(fin.scheduledPayment), false],
                [
                  'Required /mo to clear by promo',
                  fin.requiredMonthlyToClearByPromo === null
                    ? '—'
                    : money0(fin.requiredMonthlyToClearByPromo),
                  false,
                ],
                [
                  'Balance at promo expiry',
                  money0(fin.balanceAtPromoExpiry),
                  fin.warnings.includes('promo-balance-remaining'),
                ],
                ['Post-promo interest', money0(fin.postPromoInterest), false],
                ['Total interest', money0(fin.totalInterest), false],
                [
                  'Payoff month',
                  fin.payoffMonth === null
                    ? 'Not within 120 mo'
                    : fin.payoffMonth === 0
                      ? '—'
                      : `Month ${fin.payoffMonth}`,
                  false,
                ],
                ['Year-1 financing cost', money0(selected.yearOneFinancingCost), false],
              ] as const
            ).map(([k, v, warn]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0"
              >
                <dt className="text-secondary">{k}</dt>
                <dd
                  className={cx(
                    'font-medium tabular-nums',
                    warn ? 'text-warning' : 'text-ink',
                  )}
                >
                  {warn && (
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  )}
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {fin.warnings.includes('promo-balance-remaining') ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-warning" role="status">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {money0(fin.balanceAtPromoExpiry)} remains when the promotional
              period ends — post-promo interest applies from month{' '}
              {model.financing.promoMonths + 1}.
            </p>
          ) : (
            fin.creditFunded > 0 &&
            fin.payoffMonth !== null &&
            fin.payoffMonth > 0 &&
            fin.payoffMonth <= model.financing.promoMonths && (
              <p className="mt-1 text-xs text-positive">
                Paid off before promo expiry (month {fin.payoffMonth}).
              </p>
            )
          )}
        </div>
        <details className="mt-4 rounded-lg border border-line">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            Repayment schedule
          </summary>
          <div className="max-h-64 overflow-auto scroll-thin border-t border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-muted">
                  {['Month', 'Opening', 'APR', 'Interest', 'Payment', 'Closing'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fin.schedule.map((row) => (
                  <tr key={row.month} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-ink">
                      {row.month}
                      {row.promotional && (
                        <StatusPill tone="cyan" className="ml-2 !px-1.5 !py-0 text-[9px]">
                          Promo
                        </StatusPill>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {money0(row.openingBalance)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {formatPercent(row.apr, 1)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {money0(row.interest)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {money0(row.payment)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-secondary">
                      {money0(row.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Panel>

      {/* 5 — Screening vs planning preferences */}
      <Panel
        title="Screening vs planning preferences"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setPrefsOpen(true)}>
            Edit planning preferences
          </Button>
        }
      >
        <ul className="flex flex-col gap-1.5">
          {view.screening.map((check) => (
            <li
              key={check.id}
              className="flex items-center justify-between gap-3 border-b border-line/60 pb-1.5 text-sm last:border-0"
            >
              <span className="text-secondary">{check.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted tabular-nums">
                  {formatScreeningValue(check.actual, check.format)}
                  {' / '}
                  {formatScreeningValue(check.target, check.format)}
                </span>
                <StatusPill
                  tone={
                    check.status === 'meets'
                      ? 'positive'
                      : check.status === 'misses'
                        ? 'critical'
                        : 'neutral'
                  }
                >
                  {check.status}
                </StatusPill>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted">
          Adjustable preferences — not proof a deal is viable.
        </p>
      </Panel>

      {/* 6 — Warnings + reset */}
      {selected.warnings.length > 0 && (
        <Panel title="Engine notices">
          <ul className="flex flex-col gap-1.5">
            {selected.warnings.map((w) => (
              <li
                key={w}
                className="flex items-start gap-2 text-sm text-secondary"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                {WARNING_TEXT[w]}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset underwriting to seed
        </Button>
      </div>

      {/* Preferences dialog */}
      <Dialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="Planning preferences"
      >
        <p className="mb-4 text-xs text-muted">
          Adjustable preferences — not proof a deal is viable.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {(
            [
              'preferredStartupExposure',
              'maxStartupExposure',
              'reserveMonths',
              'maxMonthlyRent',
              'targetMonthlyProfit',
              'preferredPaybackMonths',
              'tempLossTolerancePerMonth',
              'tempLossToleranceMonths',
              'targetCashOnCash',
              'targetRevenueToRent',
            ] as const
          ).map((f) => {
            const pct = f === 'targetCashOnCash';
            const months = f.endsWith('Months');
            const ratio = f === 'targetRevenueToRent';
            return (
              <NumberField
                key={f}
                label={PREFERENCE_LABELS[f]}
                value={pct ? preferences[f] * 100 : preferences[f]}
                onChange={(v) =>
                  dispatch({
                    type: 'UPDATE_PREFERENCES',
                    patch: { [f]: pct ? v / 100 : v } as Partial<PlanningPreferences>,
                  })
                }
                prefix={!pct && !months && !ratio ? '$' : undefined}
                suffix={pct ? '%' : months ? 'mo' : ratio ? '×' : undefined}
                min={0}
                step={ratio ? 0.1 : 1}
              />
            );
          })}
          <NumberField
            label="Mid-term fallback min (nights)"
            value={preferences.midTermFallbackDays.min}
            onChange={(v) =>
              dispatch({
                type: 'UPDATE_PREFERENCES',
                patch: {
                  midTermFallbackDays: {
                    ...preferences.midTermFallbackDays,
                    min: v,
                  },
                },
              })
            }
            min={0}
          />
          <NumberField
            label="Mid-term fallback max (nights)"
            value={preferences.midTermFallbackDays.max}
            onChange={(v) =>
              dispatch({
                type: 'UPDATE_PREFERENCES',
                patch: {
                  midTermFallbackDays: {
                    ...preferences.midTermFallbackDays,
                    max: v,
                  },
                },
              })
            }
            min={0}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setPrefsOpen(false)}>Done</Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset underwriting?"
      >
        <p>
          Restores this property’s seed assumptions, startup costs and financing
          for all four scenarios.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({
                type: 'RESET_UNDERWRITING',
                propertyId: view.property.id,
              });
              setConfirmReset(false);
            }}
          >
            Reset underwriting
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {children}
      </div>
    </fieldset>
  );
}
