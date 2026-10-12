import { useId } from 'react';

const TONES = {
  strong: 'var(--color-positive)',
  promising: 'var(--color-cyan)',
  weak: 'var(--color-warning)',
  poor: 'var(--color-critical)',
  unavailable: 'var(--color-muted)',
};

export function ScoreRing({
  total,
  band,
  size = 64,
  ariaLabel,
}: {
  /** 0–100, null → muted ring with a dash. */
  total: number | null;
  band?: keyof typeof TONES;
  size?: number;
  ariaLabel: string;
}) {
  const titleId = useId();
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total === null ? 0 : Math.min(100, Math.max(0, total)) / 100;
  const color = TONES[band ?? 'unavailable'];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{ariaLabel}</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={stroke}
      />
      {total !== null && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${fraction * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={total === null ? size * 0.34 : size * 0.26}
        fontWeight="700"
        fill={total === null ? 'var(--color-muted)' : 'var(--color-ink)'}
        fontFamily="var(--font-display)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {total === null ? '—' : Math.round(total)}
      </text>
    </svg>
  );
}
