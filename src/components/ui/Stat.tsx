import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type StatTone =
  | 'default'
  | 'cyan'
  | 'violet'
  | 'positive'
  | 'warning'
  | 'critical';

const VALUE_TONES: Record<StatTone, string> = {
  default: 'text-ink',
  cyan: 'text-cyan',
  violet: 'text-violet',
  positive: 'text-positive',
  warning: 'text-warning',
  critical: 'text-critical',
};

export interface StatProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  tone?: StatTone;
  className?: string;
}

export function Stat({ label, value, subValue, tone = 'default', className }: StatProps) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <span
        className={cx(
          'font-display text-2xl font-semibold tabular-nums',
          VALUE_TONES[tone],
        )}
      >
        {value}
      </span>
      {subValue != null && (
        <span className="text-xs text-secondary tabular-nums">{subValue}</span>
      )}
    </div>
  );
}
