import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Non-interactive "coming later" affordance: still focusable, clearly labeled. */
  planned?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan text-[#06222b] font-semibold hover:bg-cyan/85 active:bg-cyan/75',
  secondary:
    'bg-elevated text-ink border border-line hover:border-line-strong hover:bg-elevated/80',
  ghost: 'text-secondary hover:text-ink hover:bg-elevated',
  danger:
    'bg-critical-soft text-critical border border-critical/30 hover:bg-critical/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', planned = false, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cx(
          'inline-flex select-none items-center justify-center gap-2 rounded-lg transition-colors',
          'disabled:pointer-events-none disabled:opacity-45',
          VARIANTS[variant],
          SIZES[size],
          planned && 'border border-dashed border-line-strong opacity-75',
          className,
        )}
        aria-disabled={planned || rest.disabled ? true : undefined}
        {...rest}
      >
        {children}
        {planned && (
          <span className="rounded-full bg-neutral-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Planned
          </span>
        )}
      </button>
    );
  },
);
