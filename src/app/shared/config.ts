export interface SharedConfig { url: string; publishableKey: string; workspaceId: string }

export function readSharedConfig(env: Record<string, string | boolean | undefined>): SharedConfig | null {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim();
  const publishableKey = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  const workspaceId = String(env.VITE_WORKSPACE_ID ?? '').trim();
  if (!url && !publishableKey && !workspaceId) return null;
  if (!url || !publishableKey || !workspaceId) throw new Error('Shared mode needs a Supabase URL, publishable key, and workspace ID.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
    throw new Error('Shared mode requires HTTPS (or localhost for development).');
  if (!publishableKey.startsWith('sb_publishable_')) throw new Error('Use a public sb_publishable_ key. Secret and service role keys must stay on the server.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) throw new Error('Workspace ID must be a UUID.');
  return { url, publishableKey, workspaceId };
}
