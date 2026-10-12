import type { Amenity, PropertyType } from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';

export type ExplorerSort = 'score' | 'rent-asc' | 'rent-desc' | 'profit' | 'name';

export interface ExplorerFilters {
  q: string;
  market: string;
  rentMin: number | null;
  rentMax: number | null;
  beds: number | null;
  baths: number | null;
  types: PropertyType[];
  furnishing: string;
  formerStr: boolean;
  amenities: Amenity[];
  decision: string;
  minScore: number | null;
  stage: string;
  savedOnly: boolean;
  sort: ExplorerSort;
}

export const DEFAULT_FILTERS: ExplorerFilters = {
  q: '',
  market: '',
  rentMin: null,
  rentMax: null,
  beds: null,
  baths: null,
  types: [],
  furnishing: '',
  formerStr: false,
  amenities: [],
  decision: '',
  minScore: null,
  stage: '',
  savedOnly: false,
  sort: 'score',
};

const num = (v: string | null): number | null => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const list = (v: string | null): string[] =>
  v ? v.split(',').filter(Boolean) : [];

/** Parse URL search params into structured filters. */
export function parseFilters(params: URLSearchParams): ExplorerFilters {
  const sort = params.get('sort');
  return {
    q: params.get('q') ?? '',
    market: params.get('market') ?? '',
    rentMin: num(params.get('rentMin')),
    rentMax: num(params.get('rentMax')),
    beds: num(params.get('beds')),
    baths: num(params.get('baths')),
    types: list(params.get('types')) as PropertyType[],
    furnishing: params.get('furnishing') ?? '',
    formerStr: params.get('formerStr') === '1',
    amenities: list(params.get('amenities')) as Amenity[],
    decision: params.get('decision') ?? '',
    minScore: num(params.get('minScore')),
    stage: params.get('stage') ?? '',
    savedOnly: params.get('saved') === '1',
    sort: (
      ['score', 'rent-asc', 'rent-desc', 'profit', 'name'] as const
    ).includes(sort as ExplorerSort)
      ? (sort as ExplorerSort)
      : 'score',
  };
}

/** Write filters back to params, dropping defaults for a clean URL. */
export function filtersToParams(f: ExplorerFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.market) p.set('market', f.market);
  if (f.rentMin !== null) p.set('rentMin', String(f.rentMin));
  if (f.rentMax !== null) p.set('rentMax', String(f.rentMax));
  if (f.beds !== null) p.set('beds', String(f.beds));
  if (f.baths !== null) p.set('baths', String(f.baths));
  if (f.types.length) p.set('types', f.types.join(','));
  if (f.furnishing) p.set('furnishing', f.furnishing);
  if (f.formerStr) p.set('formerStr', '1');
  if (f.amenities.length) p.set('amenities', f.amenities.join(','));
  if (f.decision) p.set('decision', f.decision);
  if (f.minScore !== null) p.set('minScore', String(f.minScore));
  if (f.stage) p.set('stage', f.stage);
  if (f.savedOnly) p.set('saved', '1');
  if (f.sort !== 'score') p.set('sort', f.sort);
  return p;
}

export function isDefaultFilters(f: ExplorerFilters): boolean {
  return JSON.stringify({ ...f, sort: 'score' }) === JSON.stringify({ ...DEFAULT_FILTERS, sort: 'score' });
}

export function applyFilters(
  views: PropertyView[],
  f: ExplorerFilters,
): PropertyView[] {
  const q = f.q.trim().toLowerCase();
  return views.filter((v) => {
    const p = v.property;
    if (q) {
      const hay = `${p.name} ${p.code} ${v.market?.city ?? ''} ${p.areaDescriptor}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.market && p.marketId !== f.market) return false;
    if (f.rentMin !== null && p.monthlyRent < f.rentMin) return false;
    if (f.rentMax !== null && p.monthlyRent > f.rentMax) return false;
    if (f.beds !== null && p.bedrooms !== f.beds) return false;
    if (f.baths !== null && p.bathrooms < f.baths) return false;
    if (f.types.length && !f.types.includes(p.type)) return false;
    if (f.furnishing && p.furnishing !== f.furnishing) return false;
    if (f.formerStr && !p.formerStr) return false;
    if (f.amenities.length && !f.amenities.every((a) => p.amenities.includes(a)))
      return false;
    if (f.decision && v.decision.classification !== f.decision) return false;
    if (f.minScore !== null && (v.score.total === null || v.score.total < f.minScore))
      return false;
    if (f.stage && v.pipeline.stage !== f.stage) return false;
    if (f.savedOnly && !v.pipeline.saved) return false;
    return true;
  });
}

export function sortViews(
  views: PropertyView[],
  sort: ExplorerSort,
): PropertyView[] {
  const out = [...views];
  switch (sort) {
    case 'score':
      return out.sort(
        (a, b) => (b.score.total ?? -1) - (a.score.total ?? -1),
      );
    case 'rent-asc':
      return out.sort((a, b) => a.property.monthlyRent - b.property.monthlyRent);
    case 'rent-desc':
      return out.sort((a, b) => b.property.monthlyRent - a.property.monthlyRent);
    case 'profit':
      return out.sort(
        (a, b) =>
          b.results.base.monthlyAverage.afterFinancingCashFlow -
          a.results.base.monthlyAverage.afterFinancingCashFlow,
      );
    case 'name':
      return out.sort((a, b) => a.property.name.localeCompare(b.property.name));
  }
}
