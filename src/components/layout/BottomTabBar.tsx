import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/app/nav';
import { cx } from '@/lib/cx';

/** Fixed bottom tab bar below lg, with safe-area padding. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-cyan' : 'text-muted hover:text-secondary',
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
