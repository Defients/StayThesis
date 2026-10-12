import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';
import type { PropertyView } from '@/app/store/selectors';
import {
  AMENITY_META,
  DRIVER_KIND_ICON,
  PROPERTY_TYPE_LABEL,
} from '@/lib/labels';
import { formatCurrency } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { StatusPill } from '@/components/ui/StatusPill';
import { PropertyIllustration } from '@/components/property/PropertyIllustration';
import { STATUS_LABEL, STATUS_TONE } from '@/features/markets/marketTones';

const FURNISHING_LABEL: Record<PropertyView['property']['furnishing'], string> = {
  furnished: 'Furnished',
  'partially-furnished': 'Partially furnished',
  unfurnished: 'Unfurnished',
};

export function OverviewTab({ view }: { view: PropertyView }) {
  const { property, market } = view;
  const drivers = market?.demandDrivers ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Panel flush className="overflow-hidden">
          <PropertyIllustration
            illustration={property.illustration}
            label={`Illustration of ${property.name}`}
          />
        </Panel>

        <Panel title="Thesis summary">
          <p className="text-sm leading-relaxed text-secondary">
            {property.description}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {property.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Amenities">
          <ul className="flex flex-wrap gap-2">
            {property.amenities.map((a) => {
              const meta = AMENITY_META[a];
              const Icon = meta.icon;
              return (
                <li
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-xs font-medium text-secondary"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan" aria-hidden />
                  {meta.label}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Panel title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {(
              [
                ['Type', PROPERTY_TYPE_LABEL[property.type]],
                ['Bedrooms', String(property.bedrooms)],
                ['Bathrooms', String(property.bathrooms)],
                ['Square feet', property.squareFeet.toLocaleString()],
                ['Year built', String(property.yearBuilt)],
                ['Style', property.style],
                ['Rent', `${formatCurrency(property.monthlyRent)}/mo`],
                ['Furnishing', FURNISHING_LABEL[property.furnishing]],
                ['Former STR', property.formerStr ? 'Yes' : 'No'],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {k}
                </dt>
                <dd className="mt-0.5 font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-cyan" aria-hidden />
              Location & demand context
            </span>
          }
        >
          <p className="text-sm text-secondary">{property.areaDescriptor}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {property.driverAccess.map((d) => {
              const driver = drivers.find((x) => x.name === d.driverName);
              const Icon = driver ? DRIVER_KIND_ICON[driver.kind] : MapPin;
              return (
                <li key={d.driverName} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-violet" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {d.driverName}
                    </span>
                    {driver && (
                      <span className="mt-1 flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`h-1 w-5 rounded-full ${i < driver.strength ? 'bg-violet' : 'bg-line'}`}
                          />
                        ))}
                        <span className="ml-1 text-[10px] text-muted">
                          {driver.strength}/5
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-secondary tabular-nums">
                    <Clock className="h-3 w-3" aria-hidden />
                    {d.minutes} min
                  </span>
                </li>
              );
            })}
          </ul>
          {market && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {market.city}, {market.stateCode}
                  </p>
                  <StatusPill tone={STATUS_TONE[market.status]} className="mt-1">
                    {STATUS_LABEL[market.status]}
                  </StatusPill>
                </div>
                <Link
                  to={`/markets?market=${market.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
                >
                  Market detail
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
