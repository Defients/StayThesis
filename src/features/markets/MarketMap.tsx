import { useId } from 'react';
import type { Market } from '@/domain/types';

/**
 * Illustrative SVG scatter-map: markets placed by projected lat/lng inside a
 * bounding box. No parcels, no basemap — explicitly not to scale.
 */
export function MarketMap({
  markets,
  selectedId,
  onSelect,
}: {
  markets: Market[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const titleId = useId();
  const W = 720;
  const H = 420;
  const pad = 48;

  const lats = markets.map((m) => m.coordinates.lat);
  const lngs = markets.map((m) => m.coordinates.lng);
  const latMin = Math.min(...lats) - 0.4;
  const latMax = Math.max(...lats) + 0.4;
  const lngMin = Math.min(...lngs) - 0.6;
  const lngMax = Math.max(...lngs) + 0.6;

  const x = (lng: number) =>
    pad + ((lng - lngMin) / (lngMax - lngMin)) * (W - pad * 2);
  const y = (lat: number) =>
    pad + ((latMax - lat) / (latMax - latMin)) * (H - pad * 2);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-labelledby={titleId}
        className="block rounded-xl border border-line bg-sunken/50"
      >
        <title id={titleId}>
          Illustrative map of demo markets projected by latitude and longitude
        </title>
        {/* faint graticule */}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(W / 7) * (i + 0.5)}
            x2={(W / 7) * (i + 0.5)}
            y1={pad * 0.5}
            y2={H - pad * 0.5}
            stroke="var(--color-line)"
            strokeOpacity="0.5"
            strokeDasharray="2 6"
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line
            key={`h${i}`}
            y1={(H / 5) * (i + 0.5)}
            y2={(H / 5) * (i + 0.5)}
            x1={pad * 0.5}
            x2={W - pad * 0.5}
            stroke="var(--color-line)"
            strokeOpacity="0.5"
            strokeDasharray="2 6"
          />
        ))}
        {markets.map((m) => {
          const selected = m.id === selectedId;
          const cx = x(m.coordinates.lng);
          const cy = y(m.coordinates.lat);
          return (
            <g
              key={m.id}
              role="button"
              tabIndex={0}
              aria-label={`${m.city}, ${m.stateCode}`}
              onClick={() => onSelect(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(m.id);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {selected && (
                <circle cx={cx} cy={cy} r="16" fill="var(--color-cyan)" fillOpacity="0.18" />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={selected ? 8 : 6}
                fill={m.status === 'active-research' ? 'var(--color-cyan)' : 'var(--color-violet)'}
                fillOpacity={selected ? 1 : 0.7}
                stroke={selected ? 'var(--color-ink)' : 'none'}
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy - 13}
                textAnchor="middle"
                fontSize="12"
                fontWeight={selected ? 700 : 500}
                fill={selected ? 'var(--color-ink)' : 'var(--color-secondary)'}
              >
                {m.city}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[11px] text-muted">
        Illustrative map — not to scale, no parcel or live geographic data.
      </figcaption>
    </figure>
  );
}
