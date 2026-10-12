import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Search, SearchX } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { usePropertyView, usePropertyViews } from '@/app/store/selectors';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { PropertyHeader } from './PropertyHeader';
import { OverviewTab } from './OverviewTab';
import { UnderwritingTab } from './UnderwritingTab';
import { ComplianceTab } from './ComplianceTab';
import { EvidenceTab } from './EvidenceTab';
import { DecisionTab } from './DecisionTab';

const TAB_IDS = ['overview', 'underwriting', 'compliance', 'evidence', 'decision'] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'decision', label: 'Decision' },
];

export default function PropertyIntelligencePage() {
  const { propertyId, tab } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lastViewed = useStore().lastViewedPropertyId;
  const view = usePropertyView(propertyId ?? null);

  useDocumentTitle(
    view ? `${view.property.name} — StayThesis` : 'Property Intelligence — StayThesis',
  );

  const viewId = view?.property.id;
  useEffect(() => {
    if (viewId) dispatch({ type: 'SET_LAST_VIEWED', propertyId: viewId });
  }, [dispatch, viewId]);

  // /property with no id → resume last viewed, otherwise show a picker.
  if (!propertyId) {
    if (lastViewed) return <Navigate to={`/property/${lastViewed}`} replace />;
    return <PropertyPicker />;
  }

  if (!view) {
    return (
      <EmptyState
        icon={SearchX}
        title={`Property “${propertyId}” was not found`}
        body="It may have been renamed or removed from the demo dataset."
        action={
          <Link to="/properties" className="text-sm font-medium text-cyan hover:underline">
            Browse the Explorer
          </Link>
        }
      />
    );
  }

  const activeTab: TabId = (TAB_IDS as readonly string[]).includes(tab ?? '')
    ? (tab as TabId)
    : 'overview';

  return (
    <div className="flex flex-col gap-5">
      <PropertyHeader view={view} />

      <Tabs
        tabs={TAB_ITEMS}
        value={activeTab}
        onChange={(id) => navigate(`/property/${view.property.id}/${id}`)}
        aria-label={`${view.property.name} workspace`}
      />

      <div role="tabpanel" aria-label={`${activeTab} tab`}>
        {activeTab === 'overview' && <OverviewTab view={view} />}
        {activeTab === 'underwriting' && <UnderwritingTab view={view} />}
        {activeTab === 'compliance' && <ComplianceTab view={view} />}
        {activeTab === 'evidence' && <EvidenceTab view={view} />}
        {activeTab === 'decision' && <DecisionTab view={view} />}
      </div>
    </div>
  );
}

/** Compact searchable picker shown at /property when nothing was viewed yet. */
function PropertyPicker() {
  const views = usePropertyViews();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return views.filter(
      (v) =>
        !q ||
        `${v.property.name} ${v.property.code} ${v.market?.city ?? ''}`
          .toLowerCase()
          .includes(q),
    );
  }, [views, query]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-ink">Open a property</h1>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search properties…"
          aria-label="Search properties"
          className="h-10 w-full rounded-lg border border-line bg-sunken pl-9 pr-3 text-sm text-ink placeholder:text-muted"
        />
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
        {results.map((v) => (
          <li key={v.property.id}>
            <Link
              to={`/property/${v.property.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-elevated/50"
            >
              <span>
                <span className="mr-2 text-[11px] font-semibold text-muted">
                  {v.property.code}
                </span>
                <span className="font-medium text-ink">{v.property.name}</span>
              </span>
              <span className="text-xs text-secondary">
                {v.market?.city}, {v.market?.stateCode}
              </span>
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">
            No properties match “{query}”.
          </li>
        )}
      </ul>
    </div>
  );
}
