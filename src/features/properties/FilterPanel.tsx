import type { Amenity, PropertyType } from '@/domain/types';
import { MARKETS } from '@/data/demo/markets';
import { STAGES } from '@/domain/crm/stages';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { NumberField } from '@/components/ui/NumberField';
import { Checkbox, Toggle } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import type { ExplorerFilters, ExplorerSort } from './filters';

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'single-family', label: 'Single-family' },
  { id: 'townhouse', label: 'Townhouse' },
  { id: 'duplex', label: 'Duplex' },
  { id: 'adu', label: 'ADU' },
  { id: 'condo', label: 'Condo' },
];

const AMENITIES: { id: Amenity; label: string }[] = [
  { id: 'parking', label: 'Parking' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'full-kitchen', label: 'Full kitchen' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'yard', label: 'Yard' },
  { id: 'air-conditioning', label: 'A/C' },
  { id: 'ev-charging', label: 'EV charging' },
  { id: 'pet-friendly', label: 'Pet-friendly' },
  { id: 'fast-wifi', label: 'Fast Wi-Fi' },
  { id: 'porch-patio', label: 'Porch / patio' },
];

const DECISIONS: { id: string; label: string }[] = [
  { id: 'QUALIFIED', label: 'Qualified' },
  { id: 'RESEARCH_CANDIDATE', label: 'Research candidate' },
  { id: 'HOLD_UNRESOLVED', label: 'On hold' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'REJECTED', label: 'Rejected' },
];

const SORTS: { id: ExplorerSort; label: string }[] = [
  { id: 'score', label: 'Score (high → low)' },
  { id: 'rent-asc', label: 'Rent (low → high)' },
  { id: 'rent-desc', label: 'Rent (high → low)' },
  { id: 'profit', label: 'Base profit/mo (high → low)' },
  { id: 'name', label: 'Name (A–Z)' },
];

export function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: ExplorerFilters;
  onChange: (patch: Partial<ExplorerFilters>) => void;
  onReset: () => void;
}) {
  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label="Search"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Name, code, or area…"
      />

      <Select
        label="Sort by"
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value as ExplorerSort })}
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        label="Market"
        value={filters.market}
        onChange={(e) => onChange({ market: e.target.value })}
      >
        <option value="">All markets</option>
        {MARKETS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.city}, {m.stateCode}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Rent min"
          prefix="$"
          min={0}
          value={filters.rentMin}
          onChange={(v) => onChange({ rentMin: v })}
        />
        <NumberField
          label="Rent max"
          prefix="$"
          min={0}
          value={filters.rentMax}
          onChange={(v) => onChange({ rentMax: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Bedrooms"
          value={filters.beds === null ? '' : String(filters.beds)}
          onChange={(e) =>
            onChange({ beds: e.target.value === '' ? null : Number(e.target.value) })
          }
        >
          <option value="">Any</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Select
          label="Bathrooms (min)"
          value={filters.baths === null ? '' : String(filters.baths)}
          onChange={(e) =>
            onChange({ baths: e.target.value === '' ? null : Number(e.target.value) })
          }
        >
          <option value="">Any</option>
          {[1, 1.5, 2].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </Select>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-secondary">
          Property type
        </legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PROPERTY_TYPES.map((t) => (
            <Checkbox
              key={t.id}
              label={t.label}
              checked={filters.types.includes(t.id)}
              onChange={() => onChange({ types: toggleIn(filters.types, t.id) })}
            />
          ))}
        </div>
      </fieldset>

      <Select
        label="Furnishing"
        value={filters.furnishing}
        onChange={(e) => onChange({ furnishing: e.target.value })}
      >
        <option value="">Any</option>
        <option value="furnished">Furnished</option>
        <option value="partially-furnished">Partially furnished</option>
        <option value="unfurnished">Unfurnished</option>
      </Select>

      <Select
        label="Compliance status"
        value={filters.decision}
        onChange={(e) => onChange({ decision: e.target.value })}
      >
        <option value="">Any</option>
        {DECISIONS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </Select>

      <Select
        label="Stage"
        value={filters.stage}
        onChange={(e) => onChange({ stage: e.target.value })}
      >
        <option value="">Any</option>
        {STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>

      <NumberField
        label="Min score"
        min={0}
        max={100}
        value={filters.minScore}
        onChange={(v) => onChange({ minScore: v })}
      />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-secondary">
          Amenities (must include all)
        </legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {AMENITIES.map((a) => (
            <Checkbox
              key={a.id}
              label={a.label}
              checked={filters.amenities.includes(a.id)}
              onChange={() =>
                onChange({ amenities: toggleIn(filters.amenities, a.id) })
              }
            />
          ))}
        </div>
      </fieldset>

      <Toggle
        label="Former STR only"
        checked={filters.formerStr}
        onChange={(v) => onChange({ formerStr: v })}
      />
      <Toggle
        label="Saved only"
        checked={filters.savedOnly}
        onChange={(v) => onChange({ savedOnly: v })}
      />

      <Button variant="secondary" size="sm" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
