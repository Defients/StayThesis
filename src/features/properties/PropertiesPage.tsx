import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { usePropertyViews } from '@/app/store/selectors';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PropertyCard } from '@/components/property/PropertyCard';
import {
  applyFilters,
  DEFAULT_FILTERS,
  filtersToParams,
  parseFilters,
  sortViews,
  type ExplorerFilters,
} from './filters';
import { FilterPanel } from './FilterPanel';
import { CompareTray } from './CompareTray';

export default function PropertiesPage() {
  useDocumentTitle('Property Explorer — StayThesis');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const views = usePropertyViews();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = (patch: Partial<ExplorerFilters>) =>
    setSearchParams(filtersToParams({ ...filters, ...patch }), {
      replace: true,
    });
  const resetFilters = () => setSearchParams(filtersToParams(DEFAULT_FILTERS));

  const results = useMemo(
    () => sortViews(applyFilters(views, filters), filters.sort),
    [views, filters],
  );

  return (
    <>
      <PageHeader
        index="03"
        title="Property Explorer"
        description="Fictional rental candidates with modeled underwriting. All figures Modeled (demo)."
        actions={
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </Button>
        }
      />

      <div className="flex items-start gap-6">
        <aside className="sticky top-24 hidden w-64 shrink-0 lg:block">
          <Panel title="Filters">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
            />
          </Panel>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="mb-4 text-sm text-secondary" role="status">
            {results.length} of {views.length} properties
          </p>

          {results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No properties match"
              body="No demo properties match the current filters. Try widening the criteria or reset them."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {results.map((v) => (
                <PropertyCard key={v.property.id} view={v} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CompareTray />

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        className="sm:max-w-md"
      >
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => {
            resetFilters();
            setFiltersOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}
