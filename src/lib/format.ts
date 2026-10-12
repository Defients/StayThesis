/**
 * Display formatting helpers. Every formatter accepts `null | undefined`
 * (and treats non-finite numbers the same) and renders the em-dash placeholder.
 */

export const UNAVAILABLE = '—';

const isUsable = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function formatCurrency(
  value: number | null | undefined,
  decimals: 0 | 2 = 0,
): string {
  if (!isUsable(value)) return UNAVAILABLE;
  // Format the absolute value and prepend a true minus sign so negatives read
  // "−$500" rather than a locale-variant like "($500)" or "$-500".
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (!isUsable(value)) return UNAVAILABLE;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** `value` is a fraction (0.42 → "42.0%"). */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (!isUsable(value)) return UNAVAILABLE;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** `value` is a fraction expressed as a multiple (2.23 → "2.23×"). */
export function formatRatio(value: number | null | undefined): string {
  if (!isUsable(value)) return UNAVAILABLE;
  return `${value.toFixed(2)}×`;
}

export function formatNumber(value: number | null | undefined): string {
  if (!isUsable(value)) return UNAVAILABLE;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    value,
  );
}

export function formatMonths(value: number | null | undefined): string {
  if (!isUsable(value)) return UNAVAILABLE;
  return `${Math.round(value)} mo`;
}
