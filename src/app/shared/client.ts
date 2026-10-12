import { createClient } from '@supabase/supabase-js';
import type { SharedConfig } from './config';
import type { WorkspaceSnapshot, WorkspaceTransport } from './protocol';
import { WorkspaceError } from './controller';

export function createSharedClient(config: SharedConfig) {
  // Sessions stay in memory. Reload requires signing in again; shared records
  // persist remotely. Offline-demo state is never imported into this workspace.
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  async function invoke(body: Record<string, unknown>) {
    const { data, error } = await client.functions.invoke('workspace', { body });
    if (error) {
      const response = 'context' in error && error.context instanceof Response ? error.context : null;
      const details = response ? await response.json().catch(() => null) : null;
      throw new WorkspaceError(details?.error ?? 'Workspace connection failed', response?.status ?? 0);
    }
    if (!data || !Number.isSafeInteger(data.version) || !data.state || !['partner-a', 'partner-b'].includes(data.partnerId))
      throw new WorkspaceError('Invalid workspace response', 502);
    return data as WorkspaceSnapshot & { notice: null | { tone: 'warning'; message: string } };
  }
  const transport: WorkspaceTransport = {
    load: () => invoke({ operation: 'load', workspaceId: config.workspaceId }),
    mutate: (action, version, requestId) => invoke({ operation: 'mutate', workspaceId: config.workspaceId, action, version, requestId }),
  };
  return { client, transport };
}
