import { useId } from 'react';
import { useContainerWidth } from '@/lib/useContainerWidth';

export interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  /** Optional overlay series drawn on a secondary (right) axis. */
  line?: { label: string; data: number[]; color?: string };
  height?: number;
  barColor?: string;
  valueFormatter?: (v: number) => string;
  lineValueFormatter?: (v: number) => string;
  /** Y-axis domain minimum for bars (default 0). */
  yMin?: number;
  ariaLabel: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Nice-number axis domain: 1/2/2.5/5/10 step ticks over a padded range. */
function niceAxis(min: number, max: number, tickTarget = 5) {
  const span = Math.max(max - min, Math.abs(max) * 0.05, 1e-9);
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;
  const raw = (hi - lo) / tickTarget;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? mag * 10;
  const dMin = Math.min(0, Math.floor(lo / step) * step);
  const dMax = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = dMin; v <= dMax + step * 0.5; v += step) ticks.push(v);
  return { min: dMin, max: dMax, ticks };
}

/**
 * Hand-rolled responsive vertical bar chart with an optional overlay line on a
 * secondary axis. Measures its container and renders at real pixel size so
 * labels stay a fixed, readable size on every viewport.
 */
export function BarChart({
  data,
  line,
  height = 220,
  barColor = 'var(--color-cyan)',
  valueFormatter = (v) => v.toFixed(0),
  lineValueFormatter = (v) => v.toFixed(1),
  yMin = 0,
  ariaLabel,
}: BarChartProps) {
  const titleId = useId();
  const { ref, width: measured } = useContainerWidth<HTMLDivElement>();
  const W = Math.max(240, Math.round(measured));
  const H = height;
  const padL = 44;
  const padR = line ? 48 : 12;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const dataMin = Math.min(0, ...data.map((d) => d.value));
  const dataMax = Math.max(...data.map((d) => d.value), 0.0001);
  const yAxis = niceAxis(Math.min(dataMin, yMin), dataMax, W < 380 ? 3 : 5);
  const lineAxis = line
    ? niceAxis(Math.min(0, ...line.data), Math.max(...line.data, 0.0001), W < 380 ? 3 : 5)
    : null;
  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(band * 0.62, 34);

  // Reduce x-axis tick density when bands get narrow.
  const xEvery = band >= 46 ? 1 : band >= 30 ? 2 : 3;
  const gridTicks = yAxis.ticks;
  const lineTicks = lineAxis?.ticks ?? [];

  const span = yAxis.max - yAxis.min || 1;
  const lineSpan = lineAxis ? lineAxis.max - lineAxis.min || 1 : 1;
  const y = (v: number) => padT + plotH - ((v - yAxis.min) / span) * plotH;
  const ly = (v: number) =>
    padT + plotH - ((v - (lineAxis?.min ?? 0)) / lineSpan) * plotH;

  const linePoints = line
    ?.data.map((v, i) => `${padL + band * i + band / 2},${ly(v)}`)
    .join(' ');

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
        {gridTicks.map((t) => {
          const gy = y(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={gy}
                y2={gy}
                stroke="var(--color-line)"
                strokeWidth="1"
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text
                x={padL - 6}
                y={gy + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {valueFormatter(t)}
              </text>
            </g>
          );
        })}
        {line &&
          lineTicks.map((t) => (
            <text
              key={t}
              x={W - padR + 6}
              y={ly(t) + 4}
              fontSize="11"
              fill="var(--color-violet)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {lineValueFormatter(t)}
            </text>
          ))}
        {data.map((d, i) => {
          const x = padL + band * i + (band - barW) / 2;
          const top = y(Math.max(d.value, 0));
          const bottom = y(Math.min(d.value, 0));
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={top}
                width={barW}
                height={Math.max(1, bottom - top)}
                rx="3"
                fill={barColor}
                fillOpacity="0.85"
              />
              {i % xEvery === 0 && (
                <text
                  x={padL + band * i + band / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-muted)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {line && line.data.length === data.length && (
          <>
            <polyline
              points={linePoints}
              fill="none"
              stroke={line.color ?? 'var(--color-violet)'}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {line.data.map((v, i) => (
              <circle
                key={i}
                cx={padL + band * i + band / 2}
                cy={ly(v)}
                r="2.5"
                fill={line.color ?? 'var(--color-violet)'}
              />
            ))}
          </>
        )}
        {data.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
            No data
          </text>
        )}
      </svg>
    </div>
  );
}

export const MONTH_LABELS = MONTHS;
