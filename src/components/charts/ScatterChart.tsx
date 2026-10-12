import { useId } from 'react';
import { useContainerWidth } from '@/lib/useContainerWidth';

export interface ScatterDatum {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Bubble radius factor, ~0.5–2. */
  size?: number;
  tone?: 'cyan' | 'violet' | 'muted';
}

export interface ScatterChartProps {
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  height?: number;
  ariaLabel: string;
  /** Called when a bubble is activated. */
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

const TONE_FILL = {
  cyan: 'var(--color-cyan)',
  violet: 'var(--color-violet)',
  muted: 'var(--color-muted)',
};

/**
 * Nice-number ticks over a padded data domain: picks a 1/2/2.5/5 step so the
 * axis reads "around the data" instead of 0→max, and returns the extended
 * domain so ticks land on round values.
 */
function niceDomain(min: number, max: number, tickTarget = 5) {
  const span = Math.max(max - min, Math.abs(max) * 0.05, 1e-9);
  const paddedMin = min - span * 0.12;
  const paddedMax = max + span * 0.12;
  const raw = (paddedMax - paddedMin) / tickTarget;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? mag * 10;
  const lo = Math.floor(paddedMin / step) * step;
  const hi = Math.ceil(paddedMax / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 0.5; v += step) ticks.push(v);
  return { min: lo, max: hi, ticks };
}

export function ScatterChart({
  data,
  xLabel,
  yLabel,
  xFormat = (v) => v.toFixed(2),
  yFormat = (v) => v.toFixed(0),
  height = 280,
  ariaLabel,
  onSelect,
  selectedId,
}: ScatterChartProps) {
  const titleId = useId();
  const { ref, width: measured } = useContainerWidth<HTMLDivElement>();
  const W = Math.max(260, Math.round(measured));
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 14;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xd = niceDomain(Math.min(...xs, 0), Math.max(...xs, 1), W < 420 ? 4 : 5);
  const yd = niceDomain(Math.min(...ys, 0), Math.max(...ys, 1));
  const cx = (x: number) => padL + ((x - xd.min) / (xd.max - xd.min || 1)) * plotW;
  const cy = (y: number) => padT + plotH - ((y - yd.min) / (yd.max - yd.min || 1)) * plotH;

  // Simple label collision pass: estimate each label's box, sort by x, and
  // stack overlapping labels on alternating rows above/below their bubble.
  const placed = data
    .map((d) => ({
      d,
      x: cx(d.x),
      y: cy(d.y),
      w: Math.max(24, d.label.length * 5.6),
    }))
    .sort((a, b) => a.x - b.x);
  const rows: { top: { end: number }[]; bottom: { end: number }[] } = {
    top: [],
    bottom: [],
  };
  const labelY = new Map<string, number>();
  const showLabels = data.length <= 7 || W >= 560;
  for (const p of placed) {
    const r = 6 * (p.d.size ?? 1);
    const half = p.w / 2 + 6;
    let lane = 0;
    for (lane = 0; lane < 4; lane += 1) {
      const side = lane % 2 === 0 ? 'top' : 'bottom';
      const row = Math.floor(lane / 2);
      const lanes = rows[side];
      lanes[row] = lanes[row] ?? { end: -Infinity };
      if (p.x - half >= lanes[row]!.end) {
        lanes[row]!.end = p.x + half;
        const dy = r + 8 + row * 13;
        labelY.set(p.d.id, side === 'top' ? p.y - dy : p.y + dy + 9);
        break;
      }
    }
    if (lane >= 4) labelY.delete(p.d.id);
  }

  return (
    <div ref={ref} className="w-full">
      <svg
        width={W}
        height={H}
        role="img"
        aria-labelledby={titleId}
        className="block max-w-full"
      >
        <title id={titleId}>{ariaLabel}</title>
        {yd.ticks.map((t) => {
          const gy = cy(t);
          return (
            <g key={`y${t}`}>
              <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="var(--color-line)" strokeDasharray="3 4" />
              <text x={padL - 6} y={gy + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {yFormat(t)}
              </text>
            </g>
          );
        })}
        {xd.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={cx(t)} x2={cx(t)} y1={padT} y2={padT + plotH} stroke="var(--color-line)" strokeDasharray="3 4" />
            <text x={cx(t)} y={H - 20} textAnchor="middle" fontSize="11" fill="var(--color-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {xFormat(t)}
            </text>
          </g>
        ))}
        <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="var(--color-secondary)">
          {xLabel}
        </text>
        <text
          x={12}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="12"
          fill="var(--color-secondary)"
          transform={`rotate(-90 12 ${padT + plotH / 2})`}
        >
          {yLabel}
        </text>
        {data.map((d) => {
          const r = 6 * (d.size ?? 1);
          const selected = d.id === selectedId;
          const fill = TONE_FILL[d.tone ?? 'cyan'];
          const ly = labelY.get(d.id);
          const dot = (
            <g>
              <circle
                cx={cx(d.x)}
                cy={cy(d.y)}
                r={r}
                fill={fill}
                fillOpacity={selected ? 0.95 : 0.5}
                stroke={selected ? 'var(--color-ink)' : fill}
                strokeWidth={selected ? 2 : 1}
              />
              {(selected || (showLabels && ly !== undefined)) && (
                <text
                  x={cx(d.x)}
                  y={selected ? cy(d.y) - r - 8 : ly}
                  textAnchor="middle"
                  fontSize="11"
                  fill={selected ? 'var(--color-ink)' : 'var(--color-muted)'}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
          return onSelect ? (
            <g
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={`${d.label}: ${xFormat(d.x)}, ${yFormat(d.y)}`}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(d.id);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {dot}
            </g>
          ) : (
            <g key={d.id}>{dot}</g>
          );
        })}
      </svg>
    </div>
  );
}
