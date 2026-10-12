import type { PartnerId } from '@/domain/types';
import type { DemoState } from '@/app/store/state';
import type { Action } from '@/app/store/reducer';

export type SharedState = Omit<DemoState,
  'actingPartnerId' | 'compare' | 'lastViewedPropertyId' | 'notice' | 'workspaceMode'>;

export interface WorkspaceSnapshot {
  version: number;
  state: SharedState;
  partnerId: PartnerId;
}

export function sharedState(state: DemoState): SharedState {
  const { actingPartnerId, compare, lastViewedPropertyId, notice, workspaceMode, ...shared } = state;
  void actingPartnerId; void compare; void lastViewedPropertyId; void notice; void workspaceMode;
  return shared;
}

export function hydrate(snapshot: WorkspaceSnapshot, local: DemoState): DemoState {
  return { ...snapshot.state, workspaceMode: 'shared', actingPartnerId: snapshot.partnerId,
    compare: local.compare, lastViewedPropertyId: local.lastViewedPropertyId, notice: local.notice };
}

export const LOCAL_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'TOGGLE_COMPARE', 'CLEAR_COMPARE', 'SET_LAST_VIEWED', 'DISMISS_NOTICE',
]);

export interface WorkspaceTransport {
  load(): Promise<WorkspaceSnapshot>;
  mutate(action: Action, version: number, requestId: string): Promise<WorkspaceSnapshot & {
    notice: DemoState['notice'];
  }>;
}
