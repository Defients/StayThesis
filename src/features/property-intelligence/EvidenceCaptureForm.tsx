import { useState } from 'react';
import { useDispatch } from '@/app/store/StoreContext';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Select } from '@/components/ui/Select';
import { MANUAL_GATE_CATEGORIES, gateLabel } from '@/domain/compliance/gates';
import type { GateCategory } from '@/domain/types';
import { nowIso } from '@/lib/clock';

export function EvidenceCaptureForm({ propertyId }: { propertyId: string }) {
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  return <details className="mb-4 rounded-lg border border-line p-3">
    <summary className="cursor-pointer text-sm font-medium text-ink">Capture a source</summary>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const read = (key: string) => String(values.get(key) ?? '').trim();
      const url = read('sourceUrl');
      if (url) {
        try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error(); }
        catch { setError('Source URL must be a valid http or https URL.'); return; }
      }
      const effective = read('effectiveAt');
      dispatch({ type: 'ADD_EVIDENCE', evidence: { entityId: propertyId,
        metric: read('metric'), value: read('value'), units: read('units') || null,
        definition: read('definition'), sourceName: read('sourceName'), sourceUrl: url || null,
        retrievedAt: nowIso(), effectiveAt: effective ? `${effective}T00:00:00.000Z` : null,
        observationPeriod: read('observationPeriod') || null, notes: read('notes'),
        gateCategory: (read('gateCategory') || null) as GateCategory | null,
      } });
      setError(''); form.reset();
    }}>
      <TextInput label="Metric or claim" name="metric" required maxLength={300} />
      <TextInput label="Observed value" name="value" required maxLength={10000} />
      <TextInput label="Source name" name="sourceName" required maxLength={300} />
      <TextInput label="Source URL (optional)" name="sourceUrl" type="url" maxLength={2048} />
      <TextInput label="Units (optional)" name="units" maxLength={300} />
      <TextInput label="Definition / scope" name="definition" maxLength={10000} />
      <TextInput label="Effective date (optional)" name="effectiveAt" type="date" />
      <TextInput label="Observation period (optional)" name="observationPeriod" maxLength={300} />
      <Select label="Related gate" name="gateCategory" defaultValue="">
        <option value="">No gate</option>
        {MANUAL_GATE_CATEGORIES.map(c => <option key={c} value={c}>{gateLabel(c)}</option>)}
      </Select>
      <TextInput label="Source notes" name="notes" maxLength={10000} />
      <p className="text-xs text-muted sm:col-span-2">Captured sources start unverified and unreviewed. Adding a source does not pass a gate. URLs are recorded as text; nothing is fetched.</p>
      {error && <p role="alert" className="text-sm text-critical sm:col-span-2">{error}</p>}
      <Button type="submit" className="justify-self-start">Add unverified evidence</Button>
    </form>
  </details>;
}
