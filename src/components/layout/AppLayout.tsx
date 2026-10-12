import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomTabBar } from './BottomTabBar';
import { DemoStrip } from './DemoStrip';
import { NoticeToast } from './NoticeToast';
import { PageSkeleton } from './PageSkeleton';

export function AppLayout() {
  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#06222b]"
      >
        Skip to content
      </a>

      <Sidebar />
      <MobileTopBar />

      <div className="min-w-0 flex-1">
        <DemoStrip />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomTabBar />
      <NoticeToast />
    </div>
  );
}
