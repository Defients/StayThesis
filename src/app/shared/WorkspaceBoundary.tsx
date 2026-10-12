import { lazy, Suspense, useState, type ReactNode } from 'react';
import { StoreProvider } from '@/app/store/StoreContext';
import { readSharedConfig } from './config';

const SharedEntry = lazy(() => import('./SharedEntry'));
let config: ReturnType<typeof readSharedConfig> = null;
let configError = '';
try { config = readSharedConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_WORKSPACE_ID: import.meta.env.VITE_WORKSPACE_ID,
}); }
catch (e) { configError = e instanceof Error ? e.message : 'Invalid shared configuration'; }

export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(false);
  if (configError) return <main className="p-8"><h1 className="text-xl text-ink">Workspace configuration needs attention</h1><p role="alert" className="mt-3 text-critical">{configError}</p></main>;
  if (!config || demo) return <StoreProvider>{children}</StoreProvider>;
  return <Suspense fallback={<p role="status" className="p-8 text-secondary">Loading sign-in…</p>}>
    <SharedEntry config={config} onDemo={() => setDemo(true)}>{children}</SharedEntry>
  </Suspense>;
}
