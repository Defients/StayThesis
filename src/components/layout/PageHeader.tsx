import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface PageHeaderProps {
  /** Eyebrow number matching the nav (e.g. "01"). */
  index: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ index, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cx('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
          {index}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-secondary">{description}</p>
      </div>
      {actions}
    </header>
  );
}
