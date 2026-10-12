import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
}

const inputClass = cx(
  'h-9 w-full rounded-lg border border-line bg-sunken px-3 text-sm text-ink',
  'placeholder:text-muted transition-colors hover:border-line-strong',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan',
  'aria-invalid:border-critical/60',
);

export function TextInput({ label, hint, className, ...rest }: TextInputProps) {
  const id = useId();
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-secondary">
        {label}
      </label>
      <input id={id} className={inputClass} {...rest} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
