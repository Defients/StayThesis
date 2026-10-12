import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useStore } from '@/app/store/StoreContext';
import { cx } from '@/lib/cx';

const TONES = {
  positive: 'border-positive/40 bg-surface text-positive',
  warning: 'border-warning/40 bg-surface text-warning',
  critical: 'border-critical/40 bg-surface text-critical',
};

const AUTO_DISMISS_MS = 5000;

/** Global action notice — refusals and confirmations, auto-dismisses. */
export function NoticeToast() {
  const { notice } = useStore();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(
      () => dispatch({ type: 'DISMISS_NOTICE' }),
      AUTO_DISMISS_MS,
    );
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  if (!notice) return null;

  return (
    <div
      role="status"
      className={cx(
        'fixed bottom-20 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-3',
        'rounded-xl border px-4 py-3 shadow-2xl shadow-black/50 lg:bottom-6',
        TONES[notice.tone],
      )}
    >
      <p className="text-sm text-ink">{notice.message}</p>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => dispatch({ type: 'DISMISS_NOTICE' })}
        className="shrink-0 rounded-md p-1 text-secondary transition-colors hover:bg-elevated hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
