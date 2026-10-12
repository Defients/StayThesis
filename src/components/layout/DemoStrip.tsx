import { useWorkspace } from '@/app/store/StoreContext';
import { Button } from '@/components/ui/Button';

/** Demo inventory remains labeled even inside the authenticated pilot. */
export function DemoStrip() {
  const workspace = useWorkspace();
  return (
    <div className="sticky top-14 z-30 border-b border-line/70 bg-bg/85 px-4 py-1.5 backdrop-blur sm:px-6 lg:top-0 lg:px-8">
      <p className="flex items-center gap-2 text-[11px] tracking-wide text-muted">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
        <span>
          <strong className="font-semibold text-secondary">DEMO DATA</strong>
          {' · '}
          synthetic figures, not verified research
        </span>
      </p>
      {workspace.mode === 'shared' && <div className="mt-1 flex flex-wrap items-center gap-2">
        <span role="status" className="text-xs text-secondary">Shared workspace · {workspace.status === 'synced' ? 'Saved' : workspace.status === 'saving' ? 'Saving…' : workspace.status === 'refreshing' ? 'Refreshing…' : 'Needs attention'}</span>
        <Button size="sm" variant="ghost" disabled={workspace.status === 'saving' || workspace.status === 'refreshing'} onClick={workspace.refresh}>Reload records</Button>
        {workspace.retry && <Button size="sm" variant="secondary" onClick={workspace.retry}>Retry pending changes</Button>}
        <Button size="sm" variant="ghost" onClick={workspace.signOut}>Sign out</Button>
        {workspace.message && <p role="alert" className="w-full text-xs text-warning">{workspace.message}</p>}
      </div>}
    </div>
  );
}
