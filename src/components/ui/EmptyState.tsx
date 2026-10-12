import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-cyan">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {body && <p className="mt-2 max-w-md text-sm text-secondary">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
