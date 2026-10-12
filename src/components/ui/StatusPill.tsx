import type { HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export type StatusTone =
  | 'neutral'
  | 'cyan'
  | 'violet'
  | 'positive'
  | 'warning'
  | 'critical';

const TONES: Record<StatusTone, string> = {
  neutral: 'bg-neutral-soft text-secondary',
  cyan: 'bg-cyan-soft text-cyan',
  violet: 'bg-violet-soft text-violet',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusPill({
  tone = 'neutral',
  className,
  ...rest
}: StatusPillProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}

export { StatusPill as Badge };
