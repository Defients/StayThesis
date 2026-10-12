import { useState } from 'react';
import { NavLink } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { NAV_ITEMS } from '@/app/nav';
import { useActingPartner, useDispatch, useWorkspace } from '@/app/store/StoreContext';
import { PARTNER_LIST } from '@/data/demo/partners';
import { cx } from '@/lib/cx';
import { LogoMark } from './LogoMark';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

/** Persistent desktop sidebar (lg+), ~248px. */
export function Sidebar() {
  const { actingPartner, setActingPartner } = useActingPartner();
  const dispatch = useDispatch();
  const { mode } = useWorkspace();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    // The outer column stretches with document height so the rail background
    // and hairline reach the bottom of long pages; the inner aside is the
    // sticky, viewport-high, independently scrolling region.
    <div className="relative z-40 hidden w-62 shrink-0 bg-sunken/70 lg:block">
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-cyan/35 via-line to-violet/30"
      />
      <aside className="sticky top-0 flex h-dvh flex-col overflow-y-auto scroll-thin">
      <div className="flex items-start gap-3 px-5 pb-6 pt-6">
        <LogoMark className="mt-0.5 h-8 w-8 shrink-0" />
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            StayThesis
          </p>
          <p className="text-[11px] leading-snug text-muted">
            Find the property. Prove the thesis.
          </p>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-elevated text-ink'
                      : 'text-secondary hover:bg-elevated/60 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden
                      className={cx(
                        'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span
                      className={cx(
                        'w-6 font-display text-[11px] font-semibold tracking-wider tabular-nums',
                        isActive ? 'text-cyan' : 'text-muted',
                      )}
                    >
                      {item.index}
                    </span>
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-4 py-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Acting as
        </p>
        <div className="flex flex-col gap-1" role="group" aria-label="Acting partner">
          {PARTNER_LIST.map((p) => {
            const active = p.id === actingPartner.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={mode === 'shared'}
                onClick={() => setActingPartner(p.id)}
                aria-pressed={active}
                className={cx(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                  active ? 'bg-elevated' : 'hover:bg-elevated/50',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
                    active ? 'bg-cyan text-[#06222b]' : 'bg-line text-secondary',
                  )}
                >
                  {p.initials}
                </span>
                <span>
                  <span className="block text-xs font-semibold text-ink">{p.name}</span>
                  <span className="block text-[11px] text-muted">{p.focus}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted">
          {mode === 'shared' ? `Signed in as ${actingPartner.name}` : 'Simulated identity — no authentication'}
        </p>
        <button
          type="button"
          hidden={mode === 'shared'}
          onClick={() => setConfirmReset(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset demo
        </button>
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
      </aside>
    </div>
  );
}
