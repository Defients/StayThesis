import type { ScreeningCheck } from '@/domain/types';
import {
  formatCurrency,
  formatMonths,
  formatPercent,
  formatRatio,
  UNAVAILABLE,
} from './format';

/** Consistent screening display: currency 0dp, ratio 2dp, percent 1dp, months. */
export function formatScreeningValue(
  value: number | null,
  format: ScreeningCheck['format'],
): string {
  if (value === null) return UNAVAILABLE;
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value, 1);
    case 'ratio':
      return formatRatio(value);
    case 'months':
      return formatMonths(value);
  }
}
