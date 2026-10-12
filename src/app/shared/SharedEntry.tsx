import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ConnectedStoreProvider } from '@/app/store/StoreContext';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Panel } from '@/components/ui/Panel';
import { Dialog } from '@/components/ui/Dialog';
import type { SharedConfig } from './config';
import { createSharedClient } from './client';
import { SharedController } from './controller';

export default function SharedEntry({ config, children, onDemo }: {
  config: SharedConfig; children: ReactNode; onDemo: () => void;
}) {
  const { client, transport } = useMemo(() => createSharedClient(config), [config]);
  const [session, setSession] = useState<Session | null>(null);
  const [controller, setController] = useState<SharedController | null>(null);
  const [, render] = useReducer(n => n + 1, 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => { data.subscription.unsubscribe(); void client.auth.signOut({ scope: 'local' }); };
  }, [client]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let connected: SharedController | undefined;
    setError(''); setBusy(true);
    void transport.load().then(snapshot => {
      if (cancelled) return;
      connected = new SharedController(transport, snapshot, render);
      setController(connected);
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load workspace'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    const interval = window.setInterval(() => { void connected?.refresh(true); }, 15000);
    return () => { cancelled = true; connected?.stop(); setController(null); window.clearInterval(interval); };
  }, [userId, transport]);

  const signOut = () => { controller?.stop(); setController(null); setSession(null); setError(''); void client.auth.signOut({ scope: 'local' }); };
  if (session && controller) return <ConnectedStoreProvider state={controller.state} dispatch={controller.dispatch}
    workspace={{ mode: 'shared', status: controller.status, message: controller.message,
      refresh: () => { void controller.refresh(); }, retry: controller.canRetry ? controller.retry : undefined, signOut }}>
    {children}
    <Dialog open={controller.status === 'error'} onClose={() => { void controller.refresh(); }} title="Shared records need attention">
      <p>{controller.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => { void controller.refresh(); }}>Reload records</Button>
        {controller.canRetry && <Button variant="secondary" onClick={controller.retry}>Retry pending changes</Button>}
        <Button variant="ghost" onClick={signOut}>Sign out</Button>
      </div>
    </Dialog>
  </ConnectedStoreProvider>;

  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-5 py-10">
    <h1 className="font-display text-3xl font-semibold text-ink">StayThesis shared workspace</h1>
    <p className="text-sm text-secondary">Private records for Joe and Deffy. Sign in with an account assigned to this workspace.</p>
    <Panel title={session ? 'Connect workspace' : 'Partner sign-in'}>
      {error && <p role="alert" className="mb-4 text-sm text-critical">{error}</p>}
      {session ? <div className="flex flex-col gap-3">
        <p role="status" className="text-sm text-secondary">{busy ? 'Loading private records…' : 'Workspace access could not be established.'}</p>
        <Button variant="secondary" onClick={signOut}>Sign out and try again</Button>
      </div> : <form className="flex flex-col gap-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try {
          const { error: authError } = await client.auth.signInWithPassword({ email, password });
          if (authError) setError('Sign-in failed. Check your email and password.');
          else setPassword('');
        } catch { setError('Sign-in service unavailable. Please try again.'); }
        finally { setBusy(false); }
      }}>
        <TextInput label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        <TextInput label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>}
    </Panel>
    <p className="text-xs text-muted">This pilot still uses fictional properties and synthetic market figures. Shared records persist; signing in does not verify compliance.</p>
    <Button variant="ghost" onClick={() => { signOut(); onDemo(); }}>Open offline demo</Button>
  </main>;
}
