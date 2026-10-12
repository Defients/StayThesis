import { useId } from 'react';

export interface HorizontalBarDatum {
  label: string;
  value: number;
  /** 0..1 fill fraction of the track. */
  fraction: number;
  tone?: 'cyan' | 'violet' | 'positive' | 'warning' | 'critical' | 'neutral';
  formatted?: string;
}

const TONES: Record<string, string> = {
  cyan: 'var(--color-cyan)',
  violet: 'var(--color-violet)',
  positive: 'var(--color-positive)',
  warning: 'var(--color-warning)',
  critical: 'var(--color-critical)',
  neutral: 'var(--color-muted)',
};

/** Labeled horizontal bar rows — good for driver strengths and small rankings. */
export function HorizontalBars({
  data,
  ariaLabel,
}: {
  data: HorizontalBarDatum[];
  ariaLabel: string;
}) {
  const titleId = useId();
  return (
    <div role="img" aria-labelledby={titleId} className="flex flex-col gap-2">
      <span id={titleId} className="sr-only">
        {ariaLabel}
      </span>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs text-secondary">
            {d.label}
          </span>
          <span className="relative h-2 flex-1 rounded-full bg-elevated">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(1, Math.max(0, d.fraction)) * 100}%`,
                background: TONES[d.tone ?? 'cyan'],
              }}
            />
          </span>
          <span className="w-14 shrink-0 text-right text-xs font-medium text-ink tabular-nums">
            {d.formatted ?? d.value}
          </span>
        </div>
      ))}
    </div>
  );
}
