import { Link } from 'react-router';
import { Scale, X } from 'lucide-react';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { usePropertyViews } from '@/app/store/selectors';
import { Button } from '@/components/ui/Button';

export function CompareTray() {
  const { compare } = useStore();
  const dispatch = useDispatch();
  const views = usePropertyViews();
  const selected = compare
    .map((id) => views.find((v) => v.property.id === id))
    .filter((v): v is NonNullable<typeof v> => !!v);

  if (selected.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Compare selection"
      className="sticky bottom-4 z-30 mx-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-line-strong bg-elevated/95 px-4 py-3 shadow-[0_8px_30px_rgb(0_0_0/0.4)] backdrop-blur"
    >
      <Scale className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-thin">
        {selected.map((v) => (
          <span
            key={v.property.id}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-xs font-medium text-ink"
          >
            {v.property.code}
            <button
              type="button"
              aria-label={`Remove ${v.property.name} from compare`}
              onClick={() =>
                dispatch({ type: 'TOGGLE_COMPARE', propertyId: v.property.id })
              }
              className="text-muted hover:text-ink"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <Link to={`/properties/compare?ids=${selected.map((v) => v.property.id).join(',')}`}>
        <Button size="sm" disabled={selected.length < 2}>
          Compare {selected.length}
        </Button>
      </Link>
    </div>
  );
}
