import { useId } from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Fill under the line. */
  fill?: boolean;
  ariaLabel: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = 'var(--color-cyan)',
  fill = true,
  ariaLabel,
}: SparklineProps) {
  const titleId = useId();
  if (data.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel} />
    );
  }
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1 || 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const points = data.map((v, i) => `${x(i)},${y(v)}`);
  const area = `${pad},${height - pad} ${points.join(' ')} ${width - pad},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
      className="block"
    >
      <title id={titleId}>{ariaLabel}</title>
      {fill && (
        <polygon points={area} fill={color} fillOpacity="0.14" stroke="none" />
      )}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
