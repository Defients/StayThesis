import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Menu, RotateCcw, X } from 'lucide-react';
import { useActingPartner, useDispatch } from '@/app/store/StoreContext';
import { PARTNER_LIST } from '@/data/demo/partners';
import { cx } from '@/lib/cx';
import { LogoMark } from './LogoMark';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

/** Compact top bar below lg: wordmark, acting partner, menu. */
export function MobileTopBar() {
  const { actingPartner, setActingPartner } = useActingPartner();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
      <Link to="/" className="flex items-center gap-2">
        <LogoMark className="h-6 w-6" />
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          StayThesis
        </span>
      </Link>

      <div className="flex items-center gap-1.5" ref={menuRef}>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan text-[11px] font-bold text-[#06222b]"
          title={`Acting as ${actingPartner.name} — simulated identity`}
        >
          {actingPartner.initials}
        </span>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-elevated hover:text-ink"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {open && (
          <div className="absolute right-3 top-14 w-64 rounded-xl border border-line-strong bg-surface p-3 shadow-2xl shadow-black/50">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Acting as
            </p>
            <div className="flex flex-col gap-1" role="group" aria-label="Acting partner">
              {PARTNER_LIST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === actingPartner.id}
                  onClick={() => setActingPartner(p.id)}
                  className={cx(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                    p.id === actingPartner.id ? 'bg-elevated' : 'hover:bg-elevated/50',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                      p.id === actingPartner.id
                        ? 'bg-cyan text-[#06222b]'
                        : 'bg-line text-secondary',
                    )}
                  >
                    {p.initials}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-ink">{p.name}</span>
                    <span className="block text-[10px] text-muted">{p.focus}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 px-1 text-[10px] text-muted">
              Simulated identity — no authentication
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmReset(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-1 text-xs font-medium text-secondary transition-colors hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset demo
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo workspace?"
      >
        <p>
          Restores the seed dataset: stages, gates, underwriting edits, notes,
          approvals, and compare selections all revert. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'RESET_DEMO' });
              setConfirmReset(false);
            }}
          >
            Reset demo
          </Button>
        </div>
      </Dialog>
    </header>
  );
}

