import type { PartnerId } from '@/domain/types';
import { createInitialState, type DemoState } from '@/app/store/state';
import { reducer, type Action } from '@/app/store/reducer';
import { sharedState, type SharedState } from '@/app/shared/protocol';
import { parseSharedAction } from './actionSchema';
import { nowIso } from '@/lib/clock';

/** A shared pilot uses fictional inventory, but no simulated consent. */
export function createSharedInitialState(): SharedState {
  const state = createInitialState();
  state.activity = [];
  state.approvals = [];
  state.outreach = [];
  state.tasks = [];
  state.checklist = state.checklist.map(c => ({ ...c, done: false }));
  state.pipeline = Object.fromEntries(Object.entries(state.pipeline).map(([id, p]) => [id,
    { ...p, stage: 'discovered', notes: [], assigneeId: null, saved: false, stageChangedAt: nowIso() }]));
  state.gates = Object.fromEntries(Object.entries(state.gates).map(([id, gates]) => [id,
    gates.map(g => ({ ...g, status: 'NEEDS_VERIFICATION', note: '', updatedBy: 'system', updatedAt: nowIso() }))]));
  state.evidence = state.evidence.map(e => ({ ...e,
    classification: e.classification === 'CALCULATED' ? 'CALCULATED' : 'UNVERIFIED',
    reviewStatus: 'UNREVIEWED', reviewer: null, audit: [],
  }));
  return sharedState(state);
}

function affectedProperty(state: DemoState, action: Action): string | null {
  if ('propertyId' in action) return action.propertyId;
  if (action.type === 'UPDATE_EVIDENCE') return state.evidence.find(e => e.id === action.id)?.entityId ?? null;
  if (action.type === 'ADD_EVIDENCE') return action.evidence.entityId;
  return null;
}

export function applySharedAction(stored: SharedState, actor: PartnerId, input: unknown): {
  state: SharedState; notice: DemoState['notice']; action: Action;
} {
  const action = parseSharedAction(input);
  const current: DemoState = { ...stored, actingPartnerId: actor, compare: [], lastViewedPropertyId: null, notice: null };
  const propertyId = affectedProperty(current, action);
  if (propertyId && !current.pipeline[propertyId]) throw new Error('Unknown property');
  if (action.type === 'ADD_TASK' && action.task.propertyId && !current.pipeline[action.task.propertyId]) throw new Error('Unknown property');
  if ('id' in action) {
    const records = action.type === 'DECIDE_APPROVAL' ? stored.approvals
      : action.type === 'TOGGLE_TASK' ? stored.tasks
      : action.type === 'TOGGLE_CHECKLIST_ITEM' ? stored.checklist : stored.evidence;
    if (!records.some(r => r.id === action.id)) throw new Error('Unknown record');
  }
  let next = reducer(current, action);
  const affectsCommitment = /^(UPDATE_(SCENARIO|STARTUP|FINANCING|MODEL)_FIELD|RESET_UNDERWRITING|SET_GATE_(STATUS|NOTE)|UPDATE_EVIDENCE|ADD_EVIDENCE|UPDATE_PREFERENCES)$/.test(action.type);
  if (affectsCommitment && next !== current && !next.notice) {
    const affected = next.approvals.filter(a => !propertyId || a.propertyId === propertyId);
    if (affected.some(a => Object.values(a.decisions).some(d => d !== 'PENDING'))) {
      next = { ...next, approvals: next.approvals.map(a => affected.includes(a)
        ? { ...a, decisions: { 'partner-a': 'PENDING', 'partner-b': 'PENDING' } } : a),
        activity: [{ id: crypto.randomUUID(), at: nowIso(), actor, propertyId,
          kind: 'approval', message: 'Commitment assumptions changed; both partners must approve again' }, ...next.activity] };
    }
  }
  return { state: sharedState(next), notice: next.notice, action };
}
