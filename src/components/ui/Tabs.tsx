import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface TabItem {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label': string;
}

/**
 * WAI-ARIA tabs with automatic activation: arrow keys move focus and select.
 */
export function Tabs({ tabs, value, onChange, 'aria-label': ariaLabel }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const count = tabs.length;
    if (count === 0) return;
    let target: number | null = null;
    if (event.key === 'ArrowRight') target = (index + 1) % count;
    else if (event.key === 'ArrowLeft') target = (index - 1 + count) % count;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = count - 1;
    if (target === null) return;
    event.preventDefault();
    // Advance past disabled tabs in the direction of travel.
    const dir = event.key === 'ArrowLeft' || event.key === 'End' ? -1 : 1;
    let i = target;
    for (let step = 0; step < count; step += 1) {
      const tab = tabs[i];
      if (tab && !tab.disabled) break;
      i = (((i + dir) % count) + count) % count;
    }
    refs.current[i]?.focus();
    const tab = tabs[i];
    if (tab && !tab.disabled) onChange(tab.id);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b border-line">
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-disabled={tab.disabled || undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              selected
                ? 'border-cyan font-semibold text-ink'
                : 'border-transparent text-secondary hover:text-ink',
              tab.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
