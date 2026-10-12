import { StatusPill } from './StatusPill';
import { cx } from '@/lib/cx';

export function DemoBadge({ className }: { className?: string }) {
  return (
    <StatusPill tone="warning" className={cx('tracking-widest', className)}>
      Demo data
    </StatusPill>
  );
}
