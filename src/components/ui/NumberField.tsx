import { useEffect, useId, useState } from 'react';
import { cx } from '@/lib/cx';

export interface NumberFieldProps {
  label: string;
  value: number | null;
  /** Emits a finite number only — never NaN. */
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  className?: string;
}

/**
 * Numeric input that keeps the last valid value: unparseable text is held in
 * the field (flagged invalid) and never reaches `onChange`. Out-of-range or
 * unparseable text is flagged on blur and the field resets to the last value.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  hint,
  className,
}: NumberFieldProps) {
  const id = useId();
  // Display rounding only — ≤4 decimals, trailing zeros trimmed — so fraction↔%
  // conversions never leak float noise into the field. The stored value is
  // untouched unless the user edits.
  const display = (v: number | null) =>
    v == null ? '' : String(Number(v.toFixed(4)));
  const [text, setText] = useState(display(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(display(value));
    setInvalid(false);
  }, [value]);

  const inRange = (n: number) =>
    (min === undefined || n >= min) && (max === undefined || n <= max);

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-secondary">
        {label}
      </label>
      <div
        className={cx(
          'flex h-9 items-center gap-1 rounded-lg border bg-sunken px-3 transition-colors',
          invalid
            ? 'border-critical/60'
            : 'border-line hover:border-line-strong',
          'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan',
        )}
      >
        {prefix && <span className="text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const n = Number(raw);
            if (raw.trim() !== '' && Number.isFinite(n)) {
              if (inRange(n)) {
                setInvalid(false);
                onChange(n);
              } else {
                setInvalid(true);
              }
            } else {
              setInvalid(true);
            }
          }}
          onBlur={() => {
            if (invalid) {
              setText(value == null ? '' : String(value));
              setInvalid(false);
            }
          }}
          className="h-full w-full bg-transparent text-sm text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      {hint && !invalid && <p className="text-xs text-muted">{hint}</p>}
      {invalid && (
        <p className="text-xs text-critical">
          Enter a number{min !== undefined ? ` ≥ ${min}` : ''}
          {max !== undefined ? ` ≤ ${max}` : ''}.
        </p>
      )}
    </div>
  );
}
