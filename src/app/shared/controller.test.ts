import { describe, expect, it, vi } from 'vitest';
import { createSharedInitialState } from '@/server/transition';
import type { WorkspaceSnapshot, WorkspaceTransport } from './protocol';
import { SharedController, WorkspaceError } from './controller';

const snapshot = (): WorkspaceSnapshot => ({ version: 1, partnerId: 'partner-a', state: createSharedInitialState() });
const settled = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

describe('shared synchronization', () => {
  it('serializes concurrent edits and keeps comparison local', async () => {
    const initial = snapshot();
    let resolve!: (value: WorkspaceSnapshot & { notice: null }) => void;
    const mutate = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; }))
      .mockResolvedValue({ ...initial, version: 3, notice: null });
    const transport: WorkspaceTransport = { load: vi.fn(), mutate };
    const controller = new SharedController(transport, initial, vi.fn());
    controller.dispatch({ type: 'TOGGLE_COMPARE', propertyId: 'st-finalist' });
    expect(mutate).not.toHaveBeenCalled();
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'First' });
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Second' });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(controller.state.pipeline['st-finalist']!.notes).toHaveLength(2);
    resolve({ ...initial, version: 2, notice: null }); await settled();
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[1]![1]).toBe(2);
    expect(controller.state.compare).toEqual(['st-finalist']);
    expect(controller.status).toBe('synced');
  });

  it('rolls back pending edits on conflict and requires a reload', async () => {
    const initial = snapshot();
    const transport: WorkspaceTransport = { load: vi.fn().mockResolvedValue({ ...initial, version: 5 }),
      mutate: vi.fn().mockRejectedValue(new WorkspaceError('Conflict', 409)) };
    const controller = new SharedController(transport, initial, vi.fn());
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Unconfirmed' });
    await settled();
    expect(controller.status).toBe('error');
    expect(controller.canRetry).toBe(false);
    expect(controller.state.pipeline['st-finalist']!.notes).toEqual([]);
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Another' });
    expect(transport.mutate).toHaveBeenCalledTimes(1);
    await controller.refresh();
    expect(controller.status).toBe('synced');
  });

  it('reuses the same request ID after a lost response', async () => {
    const initial = snapshot();
    const mutate = vi.fn().mockRejectedValueOnce(new WorkspaceError('Network', 0))
      .mockResolvedValue({ ...initial, version: 2, notice: null });
    const controller = new SharedController({ load: vi.fn(), mutate }, initial, vi.fn());
    controller.dispatch({ type: 'TOGGLE_SAVED', propertyId: 'st-finalist' });
    await settled();
    expect(controller.canRetry).toBe(true);
    controller.retry(); await settled();
    expect(mutate.mock.calls[0]![2]).toBe(mutate.mock.calls[1]![2]);
    expect(controller.status).toBe('synced');
  });

  it('does not offer retries for a definitive server refusal', async () => {
    const initial = snapshot();
    const controller = new SharedController({ load: vi.fn(),
      mutate: vi.fn().mockRejectedValue(new WorkspaceError('No membership in this workspace', 403)) }, initial, vi.fn());
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Refused' });
    await settled();
    expect(controller.canRetry).toBe(false);
    expect(controller.message).toContain('refused');
    expect(controller.state.pipeline['st-finalist']!.notes).toEqual([]);
  });

  it('keeps authenticated identity locked and shared reset unavailable', () => {
    const initial = snapshot();
    const mutate = vi.fn();
    const controller = new SharedController({ load: vi.fn(), mutate }, initial, vi.fn());
    controller.dispatch({ type: 'SET_ACTING_PARTNER', partnerId: 'partner-b' });
    controller.dispatch({ type: 'RESET_DEMO' });
    expect(controller.state.actingPartnerId).toBe('partner-a');
    expect(controller.state.notice?.tone).toBe('warning');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('ignores late responses after sign out and skips polling while saving', async () => {
    let resolve!: (value: WorkspaceSnapshot & { notice: null }) => void;
    const initial = snapshot();
    const changed = vi.fn();
    const transport: WorkspaceTransport = { load: vi.fn(), mutate: vi.fn(() => new Promise<WorkspaceSnapshot & { notice: null }>(r => { resolve = r; })) };
    const controller = new SharedController(transport, initial, changed);
    controller.dispatch({ type: 'TOGGLE_SAVED', propertyId: 'st-finalist' });
    await controller.refresh(true);
    expect(transport.load).not.toHaveBeenCalled();
    controller.stop(); const count = changed.mock.calls.length;
    resolve({ ...initial, version: 2, notice: null }); await settled();
    expect(changed).toHaveBeenCalledTimes(count);
  });

  it('preserves edits started during background polling and commits against the original version', async () => {
    const initial = snapshot();
    let resolve!: (value: WorkspaceSnapshot) => void;
    const mutate = vi.fn().mockResolvedValue({ ...initial, version: 2, notice: null });
    const transport: WorkspaceTransport = { load: vi.fn(() => new Promise<WorkspaceSnapshot>(r => { resolve = r; })), mutate };
    const controller = new SharedController(transport, initial, vi.fn());
    const reading = controller.refresh(true);
    controller.dispatch({ type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'Typed during polling' });
    expect(mutate).not.toHaveBeenCalled();
    resolve({ ...initial, version: 5 });
    await reading; await settled();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![1]).toBe(1);
    expect(controller.status).toBe('synced');
  });
});
