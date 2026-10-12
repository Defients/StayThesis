import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState } from '@/app/store/state';
import { sharedState, hydrate } from '@/app/shared/protocol';
import { selectPropertyView } from '@/app/store/selectors';
import { setIdProvider } from '@/lib/ids';
import { applySharedAction, createSharedInitialState } from './transition';
import { parseSharedAction } from './actionSchema';

afterEach(() => setIdProvider(null));

describe('canonical shared transitions', () => {
  it('starts without simulated consent, approvals, outreach or task completion', () => {
    const initial = createSharedInitialState();
    expect(initial.approvals).toEqual([]);
    expect(initial.activity).toEqual([]);
    expect(initial.outreach).toEqual([]);
    expect(Object.values(initial.pipeline).every(p => p.stage === 'discovered' && p.notes.length === 0)).toBe(true);
    expect(Object.values(initial.gates).flat().every(g => g.status === 'NEEDS_VERIFICATION')).toBe(true);
    expect(initial.evidence.some(e => e.classification === 'VERIFIED')).toBe(false);
    expect(initial.evidence.every(e => e.reviewStatus === 'UNREVIEWED')).toBe(true);
  });

  it('derives the approval actor on the server and requires two separate decisions', () => {
    const initial = createSharedInitialState();
    const requested = applySharedAction(initial, 'partner-a', {
      type: 'REQUEST_APPROVAL', propertyId: 'st-finalist', kind: 'lease-commitment', title: 'Review lease', amount: 2200,
    });
    const approval = requested.state.approvals[0]!;
    expect(approval.requestedBy).toBe('partner-a');
    const joe = applySharedAction(requested.state, 'partner-a', { type: 'DECIDE_APPROVAL', id: approval.id, decision: 'APPROVED' });
    expect(joe.state.approvals[0]!.decisions).toEqual({ 'partner-a': 'APPROVED', 'partner-b': 'PENDING' });
    const deffy = applySharedAction(joe.state, 'partner-b', { type: 'DECIDE_APPROVAL', id: approval.id, decision: 'APPROVED' });
    expect(deffy.state.approvals[0]!.decisions).toEqual({ 'partner-a': 'APPROVED', 'partner-b': 'APPROVED' });
    expect(deffy.state.activity[0]!.actor).toBe('partner-b');
    expect(() => applySharedAction(initial, 'partner-a', { type: 'SET_ACTING_PARTNER', partnerId: 'partner-b' })).toThrow();
    expect(() => applySharedAction(joe.state, 'partner-a', { type: 'DECIDE_APPROVAL', id: approval.id, decision: 'APPROVED', partnerId: 'partner-b' })).toThrow();
  });

  it('refuses qualification when gates are unknown or calculated performance fails', () => {
    let state = createSharedInitialState();
    const blocked = applySharedAction(state, 'partner-a', { type: 'MOVE_STAGE', propertyId: 'st-finalist', stage: 'qualified' });
    expect(blocked.notice?.tone).toBe('warning');
    expect(blocked.state.pipeline['st-finalist']!.stage).toBe('discovered');
    for (const gate of state.gates['st-finalist']!) state = applySharedAction(state, 'partner-a', {
      type: 'SET_GATE_STATUS', propertyId: 'st-finalist', category: gate.category, status: 'PASS',
    }).state;
    const qualified = applySharedAction(state, 'partner-a', { type: 'MOVE_STAGE', propertyId: 'st-finalist', stage: 'qualified' });
    expect(qualified.state.pipeline['st-finalist']!.stage).toBe('qualified');
    state = applySharedAction(qualified.state, 'partner-a', { type: 'UPDATE_SCENARIO_FIELD', propertyId: 'st-finalist', scenario: 'conservative', field: 'occupancyRate', value: 0 }).state;
    expect(selectPropertyView(hydrate({ state, partnerId: 'partner-a', version: 1 }, createInitialState()), 'st-finalist')!.decision.canQualify).toBe(false);
    const forged = applySharedAction(state, 'partner-a', { type: 'SET_GATE_STATUS', propertyId: 'st-finalist', category: 'conservative-performance', status: 'PASS' });
    expect(forged.notice?.tone).toBe('warning');
  });

  it('invalidates both approvals after financial or compliance changes, preserving them for notes', () => {
    let state = sharedState(createInitialState());
    const approval = state.approvals[0]!;
    state.approvals = [{ ...approval, decisions: { 'partner-a': 'APPROVED', 'partner-b': 'APPROVED' } }];
    const noted = applySharedAction(state, 'partner-b', { type: 'ADD_NOTE', propertyId: approval.propertyId, text: 'Follow up tomorrow' });
    expect(noted.state.approvals[0]!.decisions['partner-a']).toBe('APPROVED');
    const changed = applySharedAction(noted.state, 'partner-b', { type: 'UPDATE_SCENARIO_FIELD', propertyId: approval.propertyId, scenario: 'base', field: 'adr', value: 120 });
    expect(changed.state.approvals[0]!.decisions).toEqual({ 'partner-a': 'PENDING', 'partner-b': 'PENDING' });
    expect(changed.state.activity[0]!.message).toMatch(/approve again/);
    const gateChanged = applySharedAction(state, 'partner-b', { type: 'SET_GATE_STATUS', propertyId: approval.propertyId, category: 'insurance', status: 'NEEDS_VERIFICATION' });
    expect(gateChanged.state.approvals[0]!.decisions['partner-a']).toBe('PENDING');
  });

  it('captures source metadata without approving evidence or a gate', () => {
    const initial = createSharedInitialState();
    const evidence = { entityId: 'st-finalist', metric: 'Lease clause', value: 'Subletting clause needs review', units: null,
      definition: 'Unsigned draft', sourceName: 'Landlord draft', sourceUrl: 'https://example.com/lease', retrievedAt: '2026-10-11T12:00:00.000Z',
      effectiveAt: null, observationPeriod: null, notes: 'Awaiting legal review', gateCategory: 'lease-permission' };
    const result = applySharedAction(initial, 'partner-a', { type: 'ADD_EVIDENCE', evidence });
    const captured = result.state.evidence.at(-1)!;
    expect(captured).toMatchObject({ classification: 'UNVERIFIED', reviewStatus: 'UNREVIEWED', reviewer: null, sourceUrl: evidence.sourceUrl });
    expect(result.state.gates).toEqual(initial.gates);
    expect(captured.audit[0]!.actor).toBe('partner-a');
    expect(() => applySharedAction(initial, 'partner-a', { type: 'ADD_EVIDENCE', evidence: { ...evidence, sourceUrl: 'javascript:alert(1)' } })).toThrow();
    expect(() => applySharedAction(initial, 'partner-a', { type: 'ADD_EVIDENCE', evidence: { ...evidence, classification: 'VERIFIED' } })).toThrow();
  });

  it('rejects untrusted fields, nonfinite amounts and unknown records', () => {
    const initial = createSharedInitialState();
    for (const invalid of [
      { type: 'RESET_DEMO' }, { type: 'MOVE_STAGE', propertyId: 'st-finalist', stage: 'acquired' },
      { type: 'UPDATE_STARTUP_FIELD', propertyId: 'st-finalist', field: '__proto__', value: 1 },
      { type: 'UPDATE_SCENARIO_FIELD', propertyId: 'st-finalist', scenario: 'base', field: 'adr', value: Infinity },
      { type: 'REQUEST_APPROVAL', propertyId: 'st-finalist', kind: 'credit-use', title: 'Credit', amount: -1 },
    ]) expect(() => parseSharedAction(invalid)).toThrow();
    expect(() => applySharedAction(initial, 'partner-a', { type: 'ADD_NOTE', propertyId: 'missing', text: 'Hi' })).toThrow();
    expect(() => applySharedAction(initial, 'partner-a', { type: 'DECIDE_APPROVAL', id: 'missing', decision: 'APPROVED' })).toThrow();
  });

  it('never persists local state or derived evaluations', () => {
    const state = sharedState(createInitialState());
    for (const key of ['compare', 'lastViewedPropertyId', 'actingPartnerId', 'notice', 'workspaceMode', 'results', 'decision', 'score'])
      expect(state).not.toHaveProperty(key);
  });

  it('uses collision-resistant identifiers in the server runtime', () => {
    setIdProvider(prefix => `${prefix}-${crypto.randomUUID()}`);
    const state = createSharedInitialState();
    const action = { type: 'ADD_NOTE', propertyId: 'st-finalist', text: 'A note' };
    const a = applySharedAction(state, 'partner-a', action);
    const b = applySharedAction(state, 'partner-b', action);
    expect(a.state.pipeline['st-finalist']!.notes[0]!.id).not.toBe(b.state.pipeline['st-finalist']!.notes[0]!.id);
  });

  it('does not report readiness without requests or after gates regress', () => {
    const initial = createInitialState();
    initial.pipeline['st-finalist']!.stage = 'qualified';
    initial.approvals = [];
    expect(selectPropertyView(initial, 'st-finalist')!.readyToAcquire).toBe(false);
    const state = createInitialState();
    state.pipeline['st-finalist']!.stage = 'qualified';
    state.gates['st-finalist']![0]!.status = 'FAIL';
    state.approvals = state.approvals.map(a => ({ ...a, decisions: { 'partner-a': 'APPROVED', 'partner-b': 'APPROVED' } }));
    expect(selectPropertyView(state, 'st-finalist')!.readyToAcquire).toBe(false);
  });

  it('requires shared requests for startup, lease, and funded credit before readiness', () => {
    const state = createInitialState();
    state.workspaceMode = 'shared';
    state.pipeline['st-finalist']!.stage = 'qualified';
    state.approvals = [{ id: 'lease', propertyId: 'st-finalist', kind: 'lease-commitment', title: 'Lease', amount: 5000,
      requestedBy: 'partner-a', createdAt: '2026-10-11T12:00:00.000Z', decisions: { 'partner-a': 'APPROVED', 'partner-b': 'APPROVED' } }];
    expect(selectPropertyView(state, 'st-finalist')!.readyToAcquire).toBe(false);
    const complete = { ...state, approvals: [state.approvals[0]!,
      { ...state.approvals[0]!, id: 'budget', kind: 'startup-budget' as const },
      { ...state.approvals[0]!, id: 'credit', kind: 'credit-use' as const }] };
    expect(selectPropertyView(complete, 'st-finalist')!.readyToAcquire).toBe(true);
  });
});
