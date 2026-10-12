import type { Market, MarketId, SeasonalityIndex } from '@/domain/types';

const season = (
  occupancyIndex: number[],
  adrIndex: number[],
): SeasonalityIndex[] => {
  // Indices are normalized so each 12-month series means exactly 1.0 — the
  // market-level adr/occupancyRate metrics stay the annual baseline.
  const norm = (arr: number[]) => {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    return arr.map((v) => Math.round((v / mean) * 10000) / 10000);
  };
  const occ = norm(occupancyIndex);
  const adr = norm(adrIndex);
  return occ.map((o, i) => ({ occupancyIndex: o, adrIndex: adr[i] ?? 1 }));
};

/**
 * All market figures are SYNTHETIC demo values — plausible magnitudes for
 * Midwest/Southeast midsize metros, not verified market data.
 */
export const MARKETS: Market[] = [
  {
    id: 'columbus-oh',
    city: 'Columbus',
    state: 'Ohio',
    stateCode: 'OH',
    coordinates: { lat: 39.96, lng: -82.99 },
    status: 'active-research',
    regulatoryStatus: 'permit-required',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as a permit-required market with registration and safety inspection steps.',
    researchConfidence: 'high',
    metrics: {
      adr: 175,
      occupancyRate: 0.68,
      medianRent2br: 1450,
      modeledMonthlyRevenue: 3600,
      activeListings: 3400,
    },
    // Autumn bump: university football + events lift Sep–Nov.
    seasonality: season(
      [0.88, 0.85, 0.95, 1.0, 1.05, 1.1, 1.05, 1.08, 1.18, 1.25, 1.12, 0.95],
      [0.9, 0.88, 0.95, 1.0, 1.03, 1.08, 1.06, 1.1, 1.18, 1.24, 1.08, 0.92],
    ),
    demandDrivers: [
      { name: 'Major university campus', kind: 'university', strength: 5 },
      { name: 'State government complex', kind: 'corporate', strength: 4 },
      { name: 'Downtown convention district', kind: 'events', strength: 4 },
      { name: 'Regional medical center', kind: 'medical', strength: 3 },
      { name: 'Sports venues', kind: 'sports', strength: 4 },
    ],
    summary:
      'State capital anchored by a major university and a growing convention calendar. Modeled demand peaks in autumn around football weekends; winter is the soft shoulder.',
    demo: true,
  },
  {
    id: 'dayton-oh',
    city: 'Dayton',
    state: 'Ohio',
    stateCode: 'OH',
    coordinates: { lat: 39.76, lng: -84.19 },
    status: 'active-research',
    regulatoryStatus: 'registration-required',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as registration-required with an annual certificate renewal.',
    researchConfidence: 'medium',
    metrics: {
      adr: 125,
      occupancyRate: 0.58,
      medianRent2br: 1150,
      modeledMonthlyRevenue: 2200,
      activeListings: 850,
    },
    // Military + medical base demand; mild summer lift.
    seasonality: season(
      [0.9, 0.92, 1.0, 1.05, 1.1, 1.15, 1.1, 1.05, 1.0, 0.98, 0.92, 0.88],
      [0.92, 0.94, 1.0, 1.05, 1.1, 1.15, 1.12, 1.05, 1.0, 0.98, 0.94, 0.9],
    ),
    demandDrivers: [
      { name: 'Air Force base', kind: 'military', strength: 5 },
      { name: 'Regional medical center', kind: 'medical', strength: 4 },
      { name: 'Major university campus', kind: 'university', strength: 3 },
      { name: 'Aviation heritage tourism', kind: 'tourism', strength: 3 },
    ],
    summary:
      'Steady, mission-driven demand from a large Air Force installation and regional hospitals. Lower ADRs but durable mid-term furnished-stay demand.',
    demo: true,
  },
  {
    id: 'columbus-ga',
    city: 'Columbus',
    state: 'Georgia',
    stateCode: 'GA',
    coordinates: { lat: 32.46, lng: -84.99 },
    status: 'active-research',
    regulatoryStatus: 'restricted',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as restricted in several residential overlays; property-level zoning checks are essential.',
    researchConfidence: 'medium',
    metrics: {
      adr: 112,
      occupancyRate: 0.58,
      medianRent2br: 1180,
      modeledMonthlyRevenue: 1975,
      activeListings: 620,
    },
    // Army-installation demand keeps occupancy unusually steady year-round.
    seasonality: season(
      [1.0, 1.02, 1.05, 1.05, 1.02, 1.0, 0.98, 1.0, 1.02, 1.05, 1.03, 0.98],
      [0.98, 1.0, 1.03, 1.03, 1.0, 0.98, 0.97, 0.98, 1.0, 1.03, 1.02, 0.97],
    ),
    demandDrivers: [
      { name: 'Army installation', kind: 'military', strength: 5 },
      { name: 'Regional medical center', kind: 'medical', strength: 3 },
      { name: 'Whitewater events district', kind: 'events', strength: 3 },
      { name: 'Corporate regional offices', kind: 'corporate', strength: 2 },
    ],
    summary:
      'Army-installation demand keeps occupancy flat and predictable. Regulatory overlays are the catch — several residential pockets are modeled as restricted.',
    demo: true,
  },
  {
    id: 'cleveland-oh',
    city: 'Cleveland',
    state: 'Ohio',
    stateCode: 'OH',
    coordinates: { lat: 41.5, lng: -81.69 },
    status: 'active-research',
    regulatoryStatus: 'permit-required',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as permit-required with host registration and district caps.',
    researchConfidence: 'high',
    metrics: {
      adr: 132,
      occupancyRate: 0.54,
      medianRent2br: 1350,
      modeledMonthlyRevenue: 2170,
      activeListings: 2200,
    },
    // Lake-effect winter trough, strong summer peak.
    seasonality: season(
      [0.75, 0.78, 0.9, 1.0, 1.1, 1.25, 1.3, 1.25, 1.05, 1.0, 0.85, 0.72],
      [0.8, 0.82, 0.9, 1.0, 1.1, 1.22, 1.28, 1.22, 1.05, 1.0, 0.88, 0.78],
    ),
    demandDrivers: [
      { name: 'Major medical campus', kind: 'medical', strength: 5 },
      { name: 'Downtown convention district', kind: 'events', strength: 3 },
      { name: 'Lakefront tourism', kind: 'tourism', strength: 3 },
      { name: 'Major university campus', kind: 'university', strength: 3 },
    ],
    summary:
      'A major medical campus drives resilient year-round bookings, but the winter trough is deep. Underwriting must survive January–February.',
    demo: true,
  },
  {
    id: 'fort-wayne-in',
    city: 'Fort Wayne',
    state: 'Indiana',
    stateCode: 'IN',
    coordinates: { lat: 41.08, lng: -85.14 },
    status: 'active-research',
    regulatoryStatus: 'unclear',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as unclear: no dedicated STR ordinance is assumed, so zoning interpretation is unverified.',
    researchConfidence: 'low',
    metrics: {
      adr: 105,
      occupancyRate: 0.5,
      medianRent2br: 1100,
      modeledMonthlyRevenue: 1600,
      activeListings: 430,
    },
    seasonality: season(
      [0.85, 0.88, 0.98, 1.05, 1.12, 1.18, 1.15, 1.1, 1.02, 1.0, 0.92, 0.8],
      [0.88, 0.9, 0.98, 1.03, 1.08, 1.14, 1.15, 1.1, 1.02, 1.0, 0.95, 0.85],
    ),
    demandDrivers: [
      { name: 'Regional medical center', kind: 'medical', strength: 3 },
      { name: 'Downtown events arena', kind: 'events', strength: 3 },
      { name: 'University satellite campus', kind: 'university', strength: 2 },
      { name: 'Corporate manufacturing travel', kind: 'corporate', strength: 3 },
    ],
    summary:
      'Cheap rents and light competition; thin ADRs and an unclear regulatory posture. A margin-for-error market where conservative cases matter most.',
    demo: true,
  },
  {
    id: 'cincinnati-oh',
    city: 'Cincinnati',
    state: 'Ohio',
    stateCode: 'OH',
    coordinates: { lat: 39.1, lng: -84.51 },
    status: 'watchlist',
    regulatoryStatus: 'permit-required',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as permit-required with annual registration.',
    researchConfidence: 'medium',
    metrics: {
      adr: 140,
      occupancyRate: 0.6,
      medianRent2br: 1480,
      modeledMonthlyRevenue: 2550,
      activeListings: 2800,
    },
    seasonality: season(
      [0.82, 0.85, 0.95, 1.05, 1.15, 1.22, 1.2, 1.15, 1.08, 1.05, 0.95, 0.85],
      [0.85, 0.88, 0.95, 1.05, 1.15, 1.22, 1.2, 1.15, 1.08, 1.05, 0.98, 0.88],
    ),
    demandDrivers: [
      { name: 'Riverfront stadiums', kind: 'sports', strength: 4 },
      { name: 'Major university campus', kind: 'university', strength: 4 },
      { name: 'Corporate headquarters cluster', kind: 'corporate', strength: 4 },
      { name: 'Regional medical center', kind: 'medical', strength: 3 },
    ],
    summary:
      'Riverfront sports and a dense corporate cluster make this a strong watchlist market — watch for tighter caps before committing research time.',
    demo: true,
  },
  {
    id: 'indianapolis-in',
    city: 'Indianapolis',
    state: 'Indiana',
    stateCode: 'IN',
    coordinates: { lat: 39.77, lng: -86.16 },
    status: 'watchlist',
    regulatoryStatus: 'registration-required',
    regulatoryNote:
      'Demo assumption — verify with the municipality. Modeled as registration-required.',
    researchConfidence: 'medium',
    metrics: {
      adr: 135,
      occupancyRate: 0.58,
      medianRent2br: 1300,
      modeledMonthlyRevenue: 2380,
      activeListings: 1900,
    },
    // May event spike (speedway), autumn sports shoulder.
    seasonality: season(
      [0.8, 0.82, 0.92, 1.0, 1.3, 1.1, 1.05, 1.0, 1.05, 1.1, 0.95, 0.8],
      [0.82, 0.85, 0.92, 1.0, 1.35, 1.1, 1.05, 1.0, 1.05, 1.12, 0.95, 0.85],
    ),
    demandDrivers: [
      { name: 'Downtown convention district', kind: 'events', strength: 5 },
      { name: 'Sports venues', kind: 'sports', strength: 5 },
      { name: 'State government complex', kind: 'corporate', strength: 3 },
      { name: 'Regional medical center', kind: 'medical', strength: 3 },
    ],
    summary:
      'Convention-city economics: a huge May spike and reliable event weekends, with a quiet late-winter lull. Watchlist pending a rent check.',
    demo: true,
  },
];

export function marketById(id: MarketId): Market | undefined {
  return MARKETS.find((m) => m.id === id);
}
