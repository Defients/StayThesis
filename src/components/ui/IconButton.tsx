import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible label — required, icon-only buttons have no visible text. */
  label: string;
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, size = 'md', className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cx(
          'inline-flex items-center justify-center rounded-lg text-secondary transition-colors',
          'hover:bg-elevated hover:text-ink disabled:pointer-events-none disabled:opacity-45',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          className,
        )}
        {...rest}
      />
    );
  },
);
