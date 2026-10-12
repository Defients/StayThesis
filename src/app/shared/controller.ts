import { createInitialState, type DemoState } from '@/app/store/state';
import { reducer, type Action } from '@/app/store/reducer';
import type { WorkspaceControls } from '@/app/store/StoreContext';
import { hydrate, LOCAL_ACTIONS, type WorkspaceSnapshot, type WorkspaceTransport } from './protocol';

export class WorkspaceError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Serialized writes, optimistic display, and explicit recovery. A conflict
 * never automatically replays an action against somebody else's changes. */
export class SharedController {
  private snapshot: WorkspaceSnapshot;
  private queue: { action: Action; requestId: string }[] = [];
  private busy = false;
  private stopped = false;
  state: DemoState;
  status: WorkspaceControls['status'] = 'synced';
  message = '';

  constructor(private transport: WorkspaceTransport, snapshot: WorkspaceSnapshot, private changed: () => void) {
    this.snapshot = snapshot;
    this.state = hydrate(snapshot, createInitialState());
  }

  private publish() { if (!this.stopped) this.changed(); }
  private project() {
    this.state = hydrate(this.snapshot, this.state);
    for (const { action } of this.queue) this.state = reducer(this.state, action);
  }

  dispatch = (action: Action) => {
    if (this.stopped) return;
    if (LOCAL_ACTIONS.has(action.type)) { this.state = reducer(this.state, action); this.publish(); return; }
    if (action.type === 'RESET_DEMO' || action.type === 'SET_ACTING_PARTNER') {
      this.state = { ...this.state, notice: { tone: 'warning', message: 'Shared identity and records cannot be reset from the demo controls.' } };
      this.publish(); return;
    }
    if (this.status === 'error' || this.status === 'refreshing') {
      this.state = { ...this.state, notice: { tone: 'warning', message: 'Reload the workspace before making more changes.' } };
      this.publish(); return;
    }
    this.queue.push({ action, requestId: crypto.randomUUID() });
    this.state = reducer(this.state, action);
    this.status = 'saving'; this.publish();
    void this.flush();
  };

  private async flush() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      while (this.queue.length && !this.stopped) {
        const pending = this.queue[0]!;
        const result = await this.transport.mutate(pending.action, this.snapshot.version, pending.requestId);
        if (this.stopped) return;
        this.snapshot = result;
        this.queue.shift();
        this.state = { ...this.state, notice: result.notice };
        this.project(); this.publish();
      }
      this.status = 'synced'; this.message = ''; this.publish();
    } catch (error) {
      if (this.stopped) return;
      const conflict = error instanceof WorkspaceError && error.status === 409;
      const rejected = error instanceof WorkspaceError && [400, 401, 403, 413].includes(error.status);
      if (conflict || rejected) this.queue = [];
      this.status = 'error';
      this.message = conflict ? 'Another partner changed these records. Your pending changes were not saved. Reload and review before editing again.'
        : rejected ? `${error.message}. Pending changes were refused. Reload records or sign in again before editing.`
        : 'Saving is unconfirmed. Retry the same changes safely, or reload to discard pending edits and check the server.';
      this.project(); this.publish();
    } finally { this.busy = false; }
  }

  retry = () => {
    if (this.busy || this.stopped || !this.queue.length) return;
    this.status = 'saving'; this.message = ''; this.publish(); void this.flush();
  };
  get canRetry() { return this.queue.length > 0 && this.status === 'error'; }

  refresh = async (background = false) => {
    if (this.busy || this.stopped || (background && this.status !== 'synced')) return;
    this.busy = true;
    if (!background) { this.status = 'refreshing'; this.publish(); }
    try {
      const result = await this.transport.load();
      if (this.stopped) return;
      // A user may start typing while polling. Keep their queue and original
      // version; the write then succeeds or reports a conflict explicitly.
      if (background && this.queue.length) return;
      this.snapshot = result; this.queue = [];
      this.project(); this.status = 'synced'; this.message = ''; this.publish();
    } catch {
      if (this.stopped) return;
      if (background && this.queue.length) return;
      this.status = 'error'; this.message = 'Could not load the shared workspace. Check your connection and session, then reload.';
      this.publish();
    } finally {
      this.busy = false;
      if (background && this.queue.length && !this.stopped) void this.flush();
    }
  };

  stop() { this.stopped = true; }
}
