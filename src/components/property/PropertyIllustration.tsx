import { useId } from 'react';
import type { PropertyIllustration as IllustrationSpec } from '@/domain/types';
import { cx } from '@/lib/cx';

/**
 * Generated architectural illustration — a restrained dusk scene keyed on the
 * property's palette × variant: lit windows, eaves and trim, a porch or stoop
 * per variant, trees and a ground plane. Fixed 16:9 aspect: no layout shift,
 * never a photo, always labeled "Illustration".
 */

interface Palette {
  skyTop: string;
  skyBottom: string;
  horizon: string;
  wall: string;
  wallDark: string;
  roof: string;
  trim: string;
  ground: string;
}

const PALETTES: Record<IllustrationSpec['palette'], Palette> = {
  slate: { skyTop: '#1c2f4d', skyBottom: '#33517a', horizon: '#5c7ea8', wall: '#54687f', wallDark: '#40526a', roof: '#26344a', trim: '#31b8d2', ground: '#101c30' },
  sage: { skyTop: '#17322c', skyBottom: '#2b5144', horizon: '#4f8271', wall: '#5f7f6d', wallDark: '#4a6656', roof: '#274236', trim: '#3dcb91', ground: '#0e1f1a' },
  brick: { skyTop: '#251a35', skyBottom: '#413059', horizon: '#6b5486', wall: '#8a5a4b', wallDark: '#6f4639', roof: '#38252a', trim: '#9b86e8', ground: '#181023' },
  cream: { skyTop: '#1a2742', skyBottom: '#33456b', horizon: '#6478a0', wall: '#c2b295', wallDark: '#a39278', roof: '#4a4136', trim: '#31b8d2', ground: '#121a30' },
  navy: { skyTop: '#14203c', skyBottom: '#2a3f68', horizon: '#51719e', wall: '#3d5078', wallDark: '#2e3f61', roof: '#1c2a46', trim: '#9b86e8', ground: '#0d1730' },
  clay: { skyTop: '#241d24', skyBottom: '#453a40', horizon: '#7a6461', wall: '#97674f', wallDark: '#7b5340', roof: '#3e2c26', trim: '#e8b04b', ground: '#171114' },
};

const W = 320;
const H = 180;
const GROUND = 148;
const WINDOW_LIT = '#ffd9a0';

/** Lit window with a soft warm halo. */
function LitWindow({ x, y, w = 13, h = 17 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x - 2.5} y={y - 2.5} width={w + 5} height={h + 5} rx="3" fill={WINDOW_LIT} fillOpacity="0.16" />
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill={WINDOW_LIT} fillOpacity="0.92" />
      <line x1={x + w / 2} x2={x + w / 2} y1={y} y2={y + h} stroke="#8a6a3c" strokeOpacity="0.5" strokeWidth="1" />
    </g>
  );
}

function Door({ x, y, w = 20, h = 32, p, arch = false }: { x: number; y: number; w?: number; h?: number; p: Palette; arch?: boolean }) {
  const top = arch ? <path d={`M${x} ${y + 7} Q${x + w / 2} ${y - 6} ${x + w} ${y + 7} L${x + w} ${y + h} L${x} ${y + h} Z`} fill={p.wallDark} /> : <rect x={x} y={y} width={w} height={h} rx="2" fill={p.wallDark} />;
  return (
    <g>
      {top}
      <rect x={x + w * 0.18} y={y + 6} width={w * 0.28} height={h - 12} rx="1" fill={p.trim} fillOpacity="0.35" />
      <circle cx={x + w - 4.5} cy={y + h / 2 + 3} r="1.4" fill={WINDOW_LIT} />
    </g>
  );
}

function Steps({ x, w, y = GROUND }: { x: number; w: number; y?: number }) {
  return (
    <g fill="#0a1120" fillOpacity="0.55">
      <rect x={x - 2} y={y} width={w + 4} height="3.5" />
      <rect x={x - 5} y={y + 3.5} width={w + 10} height="3.5" />
    </g>
  );
}

function Tree({ x, r = 16, tone = '#0f1e2c' }: { x: number; r?: number; tone?: string }) {
  return (
    <g>
      <rect x={x - 1.6} y={GROUND - r * 0.6} width="3.2" height={r * 0.6} fill="#0a1420" />
      <circle cx={x} cy={GROUND - r} r={r} fill={tone} />
      <circle cx={x - r * 0.5} cy={GROUND - r * 0.72} r={r * 0.62} fill={tone} />
      <circle cx={x + r * 0.55} cy={GROUND - r * 0.66} r={r * 0.55} fill={tone} />
    </g>
  );
}

function Shrub({ x, r = 7, tone = '#132434' }: { x: number; r?: number; tone?: string }) {
  return <ellipse cx={x} cy={GROUND - r * 0.5} rx={r} ry={r * 0.72} fill={tone} />;
}

function Chimney({ x, y, w = 10, h = 24, p }: { x: number; y: number; w?: number; h?: number; p: Palette }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={p.wallDark} />
      <rect x={x - 1.5} y={y - 3} width={w + 3} height="4" rx="1" fill={p.roof} />
      <ellipse cx={x + w / 2} cy={y - 8} rx="3.5" ry="2.5" fill={p.skyBottom} fillOpacity="0.5" />
    </g>
  );
}

function Body({ p, variant }: { p: Palette; variant: IllustrationSpec['variant'] }) {
  const lit = WINDOW_LIT;
  switch (variant) {
    case 'gable':
      return (
        <g>
          <rect x="102" y="88" width="116" height={GROUND - 88} fill={p.wall} />
          {/* eaves overhang + fascia */}
          <path d="M92 92 160 46 228 92 Z" fill={p.roof} />
          <path d="M92 92 160 46 228 92" fill="none" stroke={p.trim} strokeOpacity="0.5" strokeWidth="2.5" />
          {/* gable trim */}
          <rect x="100" y="94" width="120" height="4" fill={p.roof} />
          <Chimney x={194} y={54} p={p} />
          <LitWindow x={114} y={104} />
          <LitWindow x={142} y={104} />
          <LitWindow x={114} y={128} h={14} />
          <Door x={184} y={112} w={20} h={36} p={p} />
          <Steps x={184} w={20} />
          <rect x={204} y={122} width="2.6" height={GROUND - 122 - 4} fill={p.wallDark} />
          <circle cx={205.3} cy={118} r="2.4" fill={lit} fillOpacity="0.9" />
        </g>
      );
    case 'craftsman':
      return (
        <g>
          <rect x="84" y="98" width="152" height={GROUND - 98} fill={p.wall} />
          {/* low-pitch roof with deep eaves */}
          <path d="M66 100 160 60 254 100 Z" fill={p.roof} />
          <rect x="80" y="100" width="160" height="5" fill={p.roof} />
          {/* porch frieze + columns */}
          <rect x="92" y="116" width="136" height="5" fill={p.wallDark} />
          {[98, 132, 186, 224].map((x) => (
            <rect key={x} x={x} y={121} width="6" height={GROUND - 121 - 4} fill={p.wallDark} />
          ))}
          <LitWindow x={142} y={126} w={12} h={16} />
          <LitWindow x={168} y={126} w={12} h={16} />
          <LitWindow x={206} y={126} w={12} h={16} />
          <Door x={112} y={120} w={18} h={28} p={p} />
          <Steps x={110} w={22} />
          <Chimney x={220} y={66} w={9} h={20} p={p} />
        </g>
      );
    case 'modern':
      return (
        <g>
          <rect x="96" y="84" width="96" height={GROUND - 84} fill={p.wall} />
          <rect x="192" y="108" width="58" height={GROUND - 108} fill={p.wallDark} />
          {/* cantilevered flat roofs */}
          <rect x="88" y="78" width="112" height="7" rx="1" fill={p.roof} />
          <rect x="186" y="102" width="70" height="7" rx="1" fill={p.roof} />
          <rect x="88" y="85" width="112" height="2" fill={p.trim} fillOpacity="0.4" />
          {/* floor-to-ceiling glass */}
          <LitWindow x={106} y={92} w={20} h={26} />
          <LitWindow x={132} y={92} w={20} h={26} />
          <LitWindow x={158} y={92} w={20} h={26} />
          <rect x="200" y={116} width="42" height={GROUND - 116 - 8} fill={lit} fillOpacity="0.35" />
          <Door x={200} y={124} w={18} h={32} p={p} />
          <Steps x={198} w={22} />
          {/* slatted screen */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={232 + i * 4} y={112} width="1.6" height={GROUND - 112} fill={p.roof} />
          ))}
        </g>
      );
    case 'rowhouse':
      return (
        <g>
          <rect x="110" y="62" width="100" height={GROUND - 62} fill={p.wall} />
          {/* cornice + parapet */}
          <rect x="104" y="56" width="112" height="7" fill={p.roof} />
          <rect x="104" y="63" width="112" height="3" fill={p.wallDark} />
          <rect x="120" y="50" width="16" height="8" fill={p.roof} />
          {[124, 152, 180].map((x) => (
            <g key={x}>
              <LitWindow x={x} y={76} w={12} h={18} />
              <LitWindow x={x} y={102} w={12} h={18} />
            </g>
          ))}
          {/* stoop */}
          <Door x={146} y={118} w={20} h={30} p={p} />
          <rect x="140" y={GROUND - 10} width="32" height="6" fill={p.wallDark} />
          <Steps x={142} w={28} />
          {[138, 172].map((x) => (
            <line key={x} x1={x} x2={x} y1={GROUND - 14} y2={GROUND + 2} stroke={p.roof} strokeWidth="1.6" />
          ))}
        </g>
      );
    case 'cottage':
      return (
        <g>
          <rect x="104" y="98" width="112" height={GROUND - 98} fill={p.wall} />
          {/* steep curved roof */}
          <path d="M90 102 Q160 44 230 102 Z" fill={p.roof} />
          <path d="M90 102 Q160 44 230 102" fill="none" stroke={p.trim} strokeOpacity="0.4" strokeWidth="2" />
          {/* dormer */}
          <rect x="146" y="66" width="28" height="24" fill={p.wall} />
          <path d="M142 68 160 54 178 68 Z" fill={p.roof} />
          <LitWindow x={152} y={72} w={16} h={14} />
          <Chimney x={198} y={56} w={9} h={22} p={p} />
          <LitWindow x={118} y={114} w={14} h={18} />
          <LitWindow x={188} y={114} w={14} h={18} />
          <Door x={150} y={116} w={22} h={32} p={p} arch />
          <Steps x={148} w={26} />
          {/* garden border */}
          {[112, 206].map((x) => (
            <Shrub key={x} x={x} r={6} tone={p.wallDark} />
          ))}
        </g>
      );
    case 'duplex':
      return (
        <g>
          <rect x="72" y="92" width="176" height={GROUND - 92} fill={p.wall} />
          {/* paired gables */}
          <path d="M60 96 116 58 172 96 Z" fill={p.roof} />
          <path d="M148 96 204 58 260 96 Z" fill={p.roof} />
          <path d="M60 96 116 58 172 96 M148 96 204 58 260 96" fill="none" stroke={p.trim} strokeOpacity="0.45" strokeWidth="2" />
          <rect x="70" y="96" width="180" height="4" fill={p.roof} />
          {/* party wall */}
          <rect x="158" y="96" width="5" height={GROUND - 96} fill={p.wallDark} />
          <LitWindow x={86} y={108} w={12} h={16} />
          <LitWindow x={130} y={108} w={12} h={16} />
          <LitWindow x={178} y={108} w={12} h={16} />
          <LitWindow x={222} y={108} w={12} h={16} />
          {/* twin entries */}
          <Door x={104} y={118} w={18} h={30} p={p} />
          <Door x={198} y={118} w={18} h={30} p={p} />
          <Steps x={102} w={22} />
          <Steps x={196} w={22} />
          {/* small awnings */}
          <rect x="100" y={114} width="26" height="4" fill={p.roof} />
          <rect x="194" y={114} width="26" height="4" fill={p.roof} />
        </g>
      );
  }
}

export function PropertyIllustration({
  illustration,
  label,
  className,
}: {
  illustration: IllustrationSpec;
  label?: string;
  className?: string;
}) {
  const gid = useId();
  const p = PALETTES[illustration.palette];
  return (
    <div
      className={cx('relative w-full overflow-hidden rounded-lg', className)}
      style={{ aspectRatio: '16 / 9' }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full"
        role="img"
        aria-label={label ?? 'Generated property illustration'}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.skyTop} />
            <stop offset="0.72" stopColor={p.skyBottom} />
            <stop offset="1" stopColor={p.horizon} />
          </linearGradient>
          <radialGradient id={`${gid}-dusk`} cx="0.5" cy="0.95" r="0.75">
            <stop offset="0" stopColor={p.horizon} stopOpacity="0.45" />
            <stop offset="1" stopColor={p.horizon} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${gid}-sky)`} />
        <rect width={W} height={H} fill={`url(#${gid}-dusk)`} />
        {/* sparse stars */}
        {[
          [36, 22], [88, 14], [140, 32], [212, 18], [268, 26], [300, 46], [58, 48],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.85} fill="#e8f0fa" fillOpacity={i % 2 ? 0.4 : 0.65} />
        ))}
        {/* moon */}
        <circle cx="282" cy="30" r="11" fill="#e8f0fa" fillOpacity="0.16" />
        <circle cx="282" cy="30" r="7" fill="#e8f0fa" fillOpacity="0.28" />
        {/* ground plane */}
        <rect x="0" y={GROUND} width={W} height={H - GROUND} fill={p.ground} />
        <rect x="0" y={GROUND} width={W} height="1.5" fill={p.trim} fillOpacity="0.3" />
        {/* walk to the door */}
        <path d={`M146 ${GROUND} L174 ${GROUND} L186 ${H} L134 ${H} Z`} fill={p.skyTop} fillOpacity="0.55" />
        {/* distant treeline */}
        <path
          d={`M0 ${GROUND} L18 ${GROUND - 12} L36 ${GROUND} L58 ${GROUND - 9} L76 ${GROUND} Z M252 ${GROUND} L270 ${GROUND - 14} L288 ${GROUND} L306 ${GROUND - 10} L320 ${GROUND - 4} L320 ${GROUND}`}
          fill={p.roof}
          fillOpacity="0.5"
        />
        {/* foreground trees + shrubs */}
        <Tree x={36} r={15} />
        <Tree x={296} r={12} tone="#0c1a26" />
        <Shrub x={68} />
        <Shrub x={272} r={6} />
        <Body p={p} variant={illustration.variant} />
      </svg>
      <span className="absolute bottom-2 left-2 rounded-md bg-bg/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted backdrop-blur-sm">
        Illustration
      </span>
    </div>
  );
}
