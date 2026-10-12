// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceHandler, ConflictError, type WorkspaceRepository } from './handler';
import { createSharedInitialState } from './transition';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const origin = 'http://localhost:5173';
function fixture() {
  let state = createSharedInitialState();
  let version = 1;
  const events = new Map<string, { userId: string; action: unknown; notice: null }>();
  const repository: WorkspaceRepository = {
    authenticate: vi.fn(async token => token === 'joe' || token === 'deffy' || token === 'outsider' ? token : null),
    read: vi.fn(async (id, user) => id === workspaceId && user !== 'outsider'
      ? { state, version, partnerId: user === 'joe' ? 'partner-a' as const : 'partner-b' as const } : null),
    findRequest: vi.fn(async (_id, request) => events.get(request) ?? null),
    commit: vi.fn(async input => {
      if (input.version !== version) throw new ConflictError();
      state = input.state; version++;
      events.set(input.requestId, { userId: input.userId, action: input.action, notice: null });
      return { state, version, notice: input.notice };
    }),
  };
  const handler = createWorkspaceHandler(repository, [origin]);
  const request = (body: unknown, token = 'joe', headers: Record<string, string> = {}) => handler(new Request('http://server/workspace', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, origin, ...headers }, body: JSON.stringify(body),
  }));
  const action = { type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Ask for lease draft' };
  const mutation = { operation: 'mutate', workspaceId, version: 1, requestId: crypto.randomUUID(), action };
  return { handler, request, repository, mutation };
}

describe('workspace HTTP authorization and commits', () => {
  it('rejects missing/invalid sessions, outsiders and other origins before mutation', async () => {
    const { request, repository, mutation } = fixture();
    expect((await request(mutation, '')).status).toBe(401);
    expect((await request(mutation, 'invalid')).status).toBe(401);
    expect((await request(mutation, 'outsider')).status).toBe(403);
    expect((await request(mutation, 'joe', { origin: 'https://untrusted.example' })).status).toBe(403);
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it('rejects client snapshots and forged actors rather than accepting them', async () => {
    const { request, repository, mutation } = fixture();
    expect((await request({ ...mutation, state: { gates: 'all pass' } })).status).toBe(400);
    expect((await request({ ...mutation, action: { ...mutation.action, actor: 'partner-b' } })).status).toBe(400);
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it('persists changes with the authenticated partner and replays request IDs once', async () => {
    const { request, repository, mutation } = fixture();
    const first = await request(mutation, 'deffy');
    expect(first.status).toBe(200);
    const initial = await first.json();
    expect(initial.state.pipeline['st-finalist'].notes[0].author).toBe('partner-b');
    expect(initial.partnerId).toBe('partner-b');
    const repeat = await request(mutation, 'deffy');
    expect(repeat.status).toBe(200);
    expect((await repeat.json()).state.pipeline['st-finalist'].notes).toHaveLength(1);
    expect(repository.commit).toHaveBeenCalledTimes(1);
    expect((await request(mutation, 'joe')).status).toBe(400);
    expect((await request({ ...mutation, action: { ...mutation.action, text: 'Another request' } }, 'deffy')).status).toBe(400);
  });

  it('rejects stale versions and commit races without overwriting', async () => {
    const { request, mutation, repository } = fixture();
    expect((await request({ ...mutation, version: 0 })).status).toBe(409);
    expect(repository.commit).not.toHaveBeenCalled();
    vi.mocked(repository.commit).mockRejectedValueOnce(new ConflictError());
    expect((await request(mutation)).status).toBe(409);
  });

  it('returns a visible gate refusal using the server finance engine', async () => {
    const { request, mutation } = fixture();
    const response = await request({ ...mutation, action: { type: 'MOVE_STAGE', propertyId: 'st-finalist', stage: 'qualified' } });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.notice.tone).toBe('warning');
    expect(result.state.pipeline['st-finalist'].stage).toBe('discovered');
  });

  it('does not leak backend diagnostics and handles malformed or oversized bodies', async () => {
    const { handler, request, mutation, repository } = fixture();
    vi.mocked(repository.commit).mockRejectedValueOnce(new Error('private database diagnostics'));
    const failed = await request(mutation);
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('private database');
    expect((await request({ ...mutation, action: { ...mutation.action, text: 'x'.repeat(40000) } })).status).toBe(413);
    expect((await handler(new Request('http://server/workspace', { method: 'POST', headers: { authorization: 'Bearer joe' }, body: '{' }))).status).toBe(400);
  });

  it('initializes only with server seed and recovers from simultaneous first loads', async () => {
    const { repository, request } = fixture();
    vi.mocked(repository.read).mockResolvedValueOnce({ version: 0, state: null, partnerId: 'partner-a' });
    const response = await request({ operation: 'load', workspaceId });
    expect(response.status).toBe(200);
    // Fixture's version check models another partner having initialized first.
    expect(repository.commit).toHaveBeenCalledWith(expect.objectContaining({ action: { type: 'INITIALIZE' }, state: expect.any(Object) }));
  });
});
