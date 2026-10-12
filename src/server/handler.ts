import type { PartnerId } from '@/domain/types';
import type { SharedState } from '@/app/shared/protocol';
import type { DemoState } from '@/app/store/state';
import { requestSchema } from './actionSchema';
import { applySharedAction, createSharedInitialState } from './transition';

export interface WorkspaceRepository {
  authenticate(token: string): Promise<string | null>;
  read(workspaceId: string, userId: string): Promise<{
    version: number; state: SharedState | null; partnerId: PartnerId;
  } | null>;
  findRequest(workspaceId: string, requestId: string): Promise<{
    userId: string; action: unknown; notice: DemoState['notice'];
  } | null>;
  commit(input: { workspaceId: string; userId: string; partnerId: PartnerId;
    version: number; requestId: string; action: unknown; state: SharedState; notice: DemoState['notice'];
  }): Promise<{ version: number; state: SharedState; notice: DemoState['notice'] }>;
}

export class ConflictError extends Error {}

export function createWorkspaceHandler(repository: WorkspaceRepository, allowedOrigins: string[]) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = origin === null || allowedOrigins.includes(origin);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (origin && allowed) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return reply(403, { error: 'Origin not allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'Use POST' });
    try {
      const authorization = request.headers.get('authorization') ?? '';
      if (!authorization.startsWith('Bearer ')) return reply(401, { error: 'Sign in required' });
      const userId = await repository.authenticate(authorization.slice(7));
      if (!userId) return reply(401, { error: 'Session expired; sign in again' });
      const raw = await request.text();
      if (raw.length > 32000) return reply(413, { error: 'Action is too large' });
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid JSON' }); }
      const validation = requestSchema.safeParse(parsed);
      if (!validation.success) return reply(400, { error: 'Invalid workspace action' });
      const input = validation.data;
      const current = await repository.read(input.workspaceId, userId);
      if (!current) return reply(403, { error: 'No membership in this workspace' });
      const partnerId = current.partnerId;
      if (input.operation === 'load') {
        if (current.state) return reply(200, { ...current });
        try {
          const result = await repository.commit({ workspaceId: input.workspaceId, userId, partnerId,
            version: current.version, requestId: crypto.randomUUID(), action: { type: 'INITIALIZE' },
            state: createSharedInitialState(), notice: null });
          return reply(200, { ...result, partnerId });
        } catch (error) {
          if (!(error instanceof ConflictError)) throw error;
          const initialized = await repository.read(input.workspaceId, userId);
          if (!initialized?.state) return reply(409, { error: 'Workspace initialization changed; reload.' });
          return reply(200, initialized);
        }
      }
      if (!current.state) return reply(409, { error: 'Load the workspace before editing' });
      const prior = await repository.findRequest(input.workspaceId, input.requestId);
      if (prior) {
        // Compare normalized JSON; validation has fixed object key order.
        const priorAction = requestSchema.options[1].shape.action.safeParse(prior.action);
        if (prior.userId !== userId || !priorAction.success || JSON.stringify(priorAction.data) !== JSON.stringify(input.action))
          return reply(400, { error: 'Request ID already used' });
        const latest = await repository.read(input.workspaceId, userId);
        if (!latest?.state) return reply(403, { error: 'No membership in this workspace' });
        return reply(200, { ...latest, notice: prior.notice });
      }
      if (input.version !== current.version) return reply(409, { error: 'Another partner changed the workspace. Reload and review before retrying.' });
      let transition;
      try { transition = applySharedAction(current.state, partnerId, input.action); }
      catch { return reply(400, { error: 'Invalid action or unknown record' }); }
      const result = await repository.commit({ workspaceId: input.workspaceId, userId, partnerId,
        version: current.version, requestId: input.requestId, action: transition.action,
        state: transition.state, notice: transition.notice });
      return reply(200, { ...result, partnerId });
    } catch (error) {
      if (error instanceof ConflictError) return reply(409, { error: 'Another partner changed the workspace. Reload and review before retrying.' });
      return reply(503, { error: 'Workspace unavailable. Your change has not been confirmed; reload before retrying.' });
    }
  };
}
