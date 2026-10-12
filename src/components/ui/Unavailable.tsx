import { cx } from '@/lib/cx';
import { UNAVAILABLE } from '@/lib/format';

export interface UnavailableProps {
  /** Why the figure is unavailable, surfaced to assistive tech + tooltip. */
  reason: string;
  className?: string;
}

export function Unavailable({ reason, className }: UnavailableProps) {
  return (
    <span className={cx('text-muted', className)} title={reason}>
      <span aria-hidden>{UNAVAILABLE}</span>
      <span className="sr-only">Unavailable: {reason}</span>
    </span>
  );
}
