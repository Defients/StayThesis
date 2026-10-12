import { describe, expect, it } from 'vitest';
import { createInitialState, type DemoState } from './state';
import { reducer } from './reducer';
import { selectPropertyView } from './selectors';

const S = (): DemoState => createInitialState();

describe('saved / compare', () => {
  it('toggles saved on a pipeline record', () => {
    let s = S();
    expect(s.pipeline['st-std-indy']!.saved).toBe(false);
    s = reducer(s, { type: 'TOGGLE_SAVED', propertyId: 'st-std-indy' });
    expect(s.pipeline['st-std-indy']!.saved).toBe(true);
    s = reducer(s, { type: 'TOGGLE_SAVED', propertyId: 'st-std-indy' });
    expect(s.pipeline['st-std-indy']!.saved).toBe(false);
  });

  it('compare caps at 3 and refuses the 4th with a notice', () => {
    let s = S();
    for (const id of ['st-finalist', 'st-blocked', 'st-weak'])
      s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: id });
    expect(s.compare).toHaveLength(3);
    s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: 'st-former-cle' });
    expect(s.compare).toHaveLength(3);
    expect(s.compare).not.toContain('st-former-cle');
    expect(s.notice?.tone).toBe('warning');
    // Toggling an existing member removes it.
    s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: 'st-weak' });
    expect(s.compare).toHaveLength(2);
    expect(s.compare).not.toContain('st-weak');
  });

  it('compare toggles do not flood the activity log', () => {
    let s = S();
    const before = s.activity.length;
    s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: 'st-finalist' });
    s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: 'st-finalist' });
    expect(s.activity.length).toBe(before);
  });
});

describe('stage moves (spec §3)', () => {
  it('refuses a move to qualified when gates are unresolved', () => {
    let s = S();
    s = reducer(s, {
      type: 'MOVE_STAGE',
      propertyId: 'st-std-indy',
      stage: 'qualified',
    });
    expect(s.pipeline['st-std-indy']!.stage).toBe('discovered');
    expect(s.notice?.tone).toBe('warning');
    expect(s.notice?.message).toMatch(/cannot qualify/i);
  });

  it('allows a move to qualified when every gate is satisfied', () => {
    const s = S();
    const next = reducer(s, {
      type: 'MOVE_STAGE',
      propertyId: 'st-finalist',
      stage: 'qualified',
    });
    expect(next.pipeline['st-finalist']!.stage).toBe('qualified');
  });

  it('allows other moves including rejected even when blocked', () => {
    const s = S();
    const next = reducer(s, {
      type: 'MOVE_STAGE',
      propertyId: 'st-blocked',
      stage: 'rejected',
    });
    expect(next.pipeline['st-blocked']!.stage).toBe('rejected');
    expect(next.activity[0]!.kind).toBe('stage-change');
  });
});

describe('gates', () => {
  it('refuses to set a calculated gate by hand', () => {
    let s = S();
    s = reducer(s, {
      type: 'SET_GATE_STATUS',
      propertyId: 'st-weak',
      category: 'conservative-performance',
      status: 'PASS',
    });
    expect(s.notice?.tone).toBe('warning');
    // Decision still BLOCKED — the calculated gate did not flip.
    const view = selectPropertyView(s, 'st-weak')!;
    expect(
      view.gates.find((g) => g.category === 'conservative-performance')?.status,
    ).toBe('FAIL');
  });

  it('a manual gate change flips the decision', () => {
    let s = S();
    expect(selectPropertyView(s, 'st-blocked')!.decision.classification).toBe(
      'BLOCKED',
    );
    // Clear the hoa FAIL → no failed gates left, but str-regulation/permit are
    // still unverified → RESEARCH_CANDIDATE.
    s = reducer(s, {
      type: 'SET_GATE_STATUS',
      propertyId: 'st-blocked',
      category: 'hoa',
      status: 'NOT_APPLICABLE',
    });
    expect(selectPropertyView(s, 'st-blocked')!.decision.classification).toBe(
      'RESEARCH_CANDIDATE',
    );
  });
});

describe('underwriting', () => {
  it('an underwriting change alters computed results', () => {
    const s = S();
    const before = selectPropertyView(s, 'st-finalist')!;
    const next = reducer(s, {
      type: 'UPDATE_SCENARIO_FIELD',
      propertyId: 'st-finalist',
      scenario: 'base',
      field: 'adr',
      value: 400,
    });
    const after = selectPropertyView(next, 'st-finalist')!;
    expect(
      after.results.base.annual.grossBookingRevenue,
    ).toBeGreaterThan(before.results.base.annual.grossBookingRevenue);
  });

  it('RESET_UNDERWRITING restores the seed model', () => {
    let s = S();
    s = reducer(s, {
      type: 'UPDATE_SCENARIO_FIELD',
      propertyId: 'st-finalist',
      scenario: 'base',
      field: 'adr',
      value: 400,
    });
    s = reducer(s, { type: 'RESET_UNDERWRITING', propertyId: 'st-finalist' });
    expect(s.underwriting['st-finalist']!.scenarios.base.adr).toBeCloseTo(
      175 * 1.25,
      6,
    );
  });

  it('per-field updates coalesce into one activity event', () => {
    let s = S();
    const before = s.activity.length;
    const act = (value: number) =>
      reducer(s, {
        type: 'UPDATE_SCENARIO_FIELD',
        propertyId: 'st-finalist',
        scenario: 'base',
        field: 'adr',
        value,
      });
    s = act(200);
    expect(s.activity.length).toBe(before + 1);
    expect(s.activity[0]!.message).toMatch(/Updated Base ADR to \$200/);
    s = act(210);
    s = act(220);
    // Same actor + field + record → still one new event, latest value.
    expect(s.activity.length).toBe(before + 1);
    expect(s.activity[0]!.message).toMatch(/Updated Base ADR to \$220/);
    // A different field starts a new event.
    s = reducer(s, {
      type: 'UPDATE_STARTUP_FIELD',
      propertyId: 'st-finalist',
      field: 'furnishing',
      value: 900,
    });
    expect(s.activity.length).toBe(before + 2);
    expect(s.activity[0]!.message).toMatch(/Updated Furnishing to \$900/);
  });

  it('sanitizes preference and weight patches', () => {
    let s = S();
    s = reducer(s, {
      type: 'UPDATE_PREFERENCES',
      patch: { targetMonthlyProfit: -500, reserveMonths: 4 },
    });
    expect(s.preferences.targetMonthlyProfit).toBe(1500); // negative rejected
    expect(s.preferences.reserveMonths).toBe(4);
    s = reducer(s, {
      type: 'UPDATE_SCORE_WEIGHTS',
      patch: { location: Number.NaN, aesthetics: 20 },
    });
    expect(s.scoreWeights.location).toBe(15); // NaN rejected
    expect(s.scoreWeights.aesthetics).toBe(20);
  });
});

describe('evidence', () => {
  it('update appends an audit entry and never auto-sets VERIFIED', () => {
    const s = S();
    const target = s.evidence.find(
      (e) => e.entityId === 'st-finalist' && e.classification !== 'VERIFIED',
    )!;
    const next = reducer(s, {
      type: 'UPDATE_EVIDENCE',
      id: target.id,
      patch: { reviewStatus: 'REVIEWED' },
    });
    const updated = next.evidence.find((e) => e.id === target.id)!;
    expect(updated.reviewStatus).toBe('REVIEWED');
    expect(updated.reviewer).toBe('partner-a');
    expect(updated.classification).toBe(target.classification); // unchanged
    expect(updated.audit.length).toBe(target.audit.length + 1);
    expect(updated.audit.at(-1)!.actor).toBe('partner-a');
    expect(updated.audit.at(-1)!.action).toBe('Marked REVIEWED');
  });

  it('audit entry describes classification and history transitions', () => {
    const s = S();
    const target = s.evidence.find(
      (e) => e.entityId === 'st-finalist' && e.classification !== 'VERIFIED',
    )!;
    const next = reducer(s, {
      type: 'UPDATE_EVIDENCE',
      id: target.id,
      patch: { classification: 'VERIFIED', historyState: 'STALE' },
    });
    const updated = next.evidence.find((e) => e.id === target.id)!;
    expect(updated.audit.at(-1)!.action).toBe(
      `Classification ${target.classification} → VERIFIED; History ${target.historyState} → STALE`,
    );
  });

  it('a no-op evidence patch does not append an audit entry', () => {
    const s = S();
    const target = s.evidence.find((e) => e.entityId === 'st-finalist')!;
    const next = reducer(s, {
      type: 'UPDATE_EVIDENCE',
      id: target.id,
      patch: { classification: target.classification },
    });
    expect(next).toBe(s);
  });
});

describe('approvals', () => {
  it('a partner decides only their own slot', () => {
    let s = S();
    s = reducer(s, {
      type: 'DECIDE_APPROVAL',
      id: 'appr-001',
      decision: 'APPROVED',
    });
    const appr = s.approvals.find((a) => a.id === 'appr-001')!;
    expect(appr.decisions['partner-a']).toBe('APPROVED');
    expect(appr.decisions['partner-b']).toBe('PENDING');
    // Switch to partner-b and decline — only partner-b's slot changes.
    s = reducer(s, { type: 'SET_ACTING_PARTNER', partnerId: 'partner-b' });
    s = reducer(s, {
      type: 'DECIDE_APPROVAL',
      id: 'appr-001',
      decision: 'DECLINED',
    });
    const appr2 = s.approvals.find((a) => a.id === 'appr-001')!;
    expect(appr2.decisions['partner-b']).toBe('DECLINED');
    expect(appr2.decisions['partner-a']).toBe('APPROVED');
    expect(s.activity[0]!.message).toMatch(/Deffy declined/);
  });

  it('REQUEST_APPROVAL creates a dual-pending request by the acting partner', () => {
    let s = S();
    const before = s.approvals.length;
    s = reducer(s, {
      type: 'REQUEST_APPROVAL',
      propertyId: 'st-consent-cbus',
      kind: 'lease-commitment',
      title: 'Commit to 12-month lease',
    });
    expect(s.approvals.length).toBe(before + 1);
    const req = s.approvals[s.approvals.length - 1]!;
    expect(req.propertyId).toBe('st-consent-cbus');
    expect(req.kind).toBe('lease-commitment');
    expect(req.requestedBy).toBe('partner-a');
    expect(req.decisions).toEqual({
      'partner-a': 'PENDING',
      'partner-b': 'PENDING',
    });
    // Amount defaults to the BASE startup cash requirement.
    const view = selectPropertyView(s, 'st-consent-cbus')!;
    expect(req.amount).toBeCloseTo(
      view.results.base.capital.startupCashRequirement,
      6,
    );
    expect(s.activity[0]!.kind).toBe('approval');
    expect(s.activity[0]!.message).toMatch(
      /Joe requested approval — "Commit to 12-month lease"/,
    );

    // Explicit amount is respected; blank titles are ignored.
    s = reducer(s, {
      type: 'REQUEST_APPROVAL',
      propertyId: 'st-consent-cbus',
      kind: 'credit-use',
      title: 'Credit draw',
      amount: 1200,
    });
    expect(s.approvals[s.approvals.length - 1]!.amount).toBe(1200);
    s = reducer(s, {
      type: 'REQUEST_APPROVAL',
      propertyId: 'st-consent-cbus',
      kind: 'credit-use',
      title: '   ',
    });
    expect(s.approvals[s.approvals.length - 1]!.title).toBe('Credit draw');
  });

  it('approval activity uses real names and decision labels', () => {
    let s = S();
    s = reducer(s, { type: 'SET_ACTING_PARTNER', partnerId: 'partner-b' });
    s = reducer(s, {
      type: 'DECIDE_APPROVAL',
      id: 'appr-001',
      decision: 'APPROVED',
    });
    expect(s.activity[0]!.message).toMatch(/Deffy approved/);
    expect(s.activity[0]!.message).not.toMatch(/approvedd/i);
  });
});

describe('activity + reset', () => {
  it('partner actions append activity events (newest first)', () => {
    let s = S();
    const before = s.activity.length;
    s = reducer(s, { type: 'TOGGLE_SAVED', propertyId: 'st-std-indy' });
    expect(s.activity.length).toBe(before + 1);
    expect(s.activity[0]!.actor).toBe('partner-a');
    expect(s.activity[0]!.propertyId).toBe('st-std-indy');
  });

  it('RESET_DEMO restores the seed state', () => {
    let s = S();
    s = reducer(s, { type: 'MOVE_STAGE', propertyId: 'st-std-indy', stage: 'rejected' });
    s = reducer(s, { type: 'TOGGLE_SAVED', propertyId: 'st-std-indy' });
    s = reducer(s, { type: 'TOGGLE_COMPARE', propertyId: 'st-std-indy' });
    s = reducer(s, { type: 'RESET_DEMO' });
    expect(s.pipeline['st-std-indy']!.stage).toBe('discovered');
    expect(s.pipeline['st-std-indy']!.saved).toBe(false);
    expect(s.compare).toHaveLength(0);
    expect(s.notice).toBeNull();
  });
});
