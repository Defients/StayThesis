import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface PanelProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  /** Remove body padding for flush content (tables, full-bleed charts). */
  flush?: boolean;
}

export function Panel({ title, actions, flush, className, children, ...rest }: PanelProps) {
  return (
    <section
      className={cx('rounded-xl border border-line bg-surface', className)}
      {...rest}
    >
      {(title != null || actions != null) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold tracking-wide text-ink">
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={flush ? undefined : 'p-5'}>{children}</div>
    </section>
  );
}
