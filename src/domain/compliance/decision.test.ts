import { describe, expect, it } from 'vitest';
import type {
  GateCategory,
  GateRecord,
  GateStatus,
  ScoreResult,
} from '../types';
import { evaluateGates, GATE_DEFINITIONS } from './gates';
import { evaluateDecision } from './decision';
import { computeAllScenarios } from '../finance';
import { fixtureF } from '../finance/fixture';
import { DEFAULT_PREFERENCES } from '../preferences';

const prefs = DEFAULT_PREFERENCES;

const record = (category: GateCategory, status: GateStatus): GateRecord => ({
  category,
  status,
  note: '',
  updatedAt: '2026-10-01T00:00:00.000Z',
  updatedBy: 'partner-a',
});

/** Records covering all 7 manual gates at the given status. */
const allManual = (status: GateStatus): GateRecord[] =>
  GATE_DEFINITIONS.filter((d) => d.mode === 'manual').map((d) =>
    record(d.category, status),
  );

const score = (total: number): ScoreResult => ({
  total,
  factors: {
    financialStrength: total,
    guestExperience: total,
    aesthetics: total,
    location: total,
    demandStability: total,
    operationalSimplicity: total,
    evidenceConfidence: total,
  },
  band: 'strong',
});

const decide = (
  stage: Parameters<typeof evaluateDecision>[0]['stage'],
  records: GateRecord[],
  results = computeAllScenarios(fixtureF()),
) => {
  const gates = evaluateGates(records, results, prefs);
  return evaluateDecision({
    stage,
    gates,
    score: score(85),
    results,
    preferences: prefs,
  });
};

describe('evaluateGates', () => {
  const results = computeAllScenarios(fixtureF());

  it('returns all 10 gates in table order', () => {
    const gates = evaluateGates([], results, prefs);
    expect(gates).toHaveLength(10);
    expect(gates.map((g) => g.category)).toEqual([
      'str-regulation',
      'zoning',
      'permit',
      'hoa',
      'landlord-authorization',
      'lease-permission',
      'insurance',
      'capital-feasibility',
      'conservative-performance',
      'evidence-quality',
    ]);
    expect(gates.every((g) => g.critical)).toBe(true);
  });

  it('missing manual record → NEEDS_VERIFICATION', () => {
    const gates = evaluateGates([], results, prefs);
    const manual = gates.filter((g) => g.mode === 'manual');
    expect(manual).toHaveLength(8);
    expect(manual.every((g) => g.status === 'NEEDS_VERIFICATION')).toBe(true);
  });

  it('calculated gates pass on fixture F', () => {
    const gates = evaluateGates([], results, prefs);
    expect(gates.find((g) => g.category === 'capital-feasibility')?.status).toBe(
      'PASS',
    );
    expect(
      gates.find((g) => g.category === 'conservative-performance')?.status,
    ).toBe('PASS');
  });

  it('capital-feasibility FAILs when startup exceeds max exposure', () => {
    const model = fixtureF({ startup: { furnishing: 9000 } });
    const gates = evaluateGates([], computeAllScenarios(model), prefs);
    const gate = gates.find((g) => g.category === 'capital-feasibility')!;
    expect(gate.status).toBe('FAIL');
    expect(gate.note).toContain('13,700');
    expect(gate.note).toContain('10,000');
  });

  it('conservative-performance FAILs when conservative OCF goes negative', () => {
    const model = fixtureF();
    model.scenarios.conservative.rent = 6000;
    const gates = evaluateGates([], computeAllScenarios(model), prefs);
    const gate = gates.find((g) => g.category === 'conservative-performance')!;
    expect(gate.status).toBe('FAIL');
  });
});

describe('evaluateDecision', () => {
  it('rejected stage → REJECTED regardless of gates', () => {
    const d = decide('rejected', []);
    expect(d.classification).toBe('REJECTED');
    expect(d.headline).toBe('Rejected by the team');
    expect(d.canQualify).toBe(false);
  });

  it('FAIL beats everything — even a high score stays BLOCKED', () => {
    const records = allManual('PASS');
    records[0] = record('str-regulation', 'FAIL');
    const d = decide('researching', records);
    expect(d.classification).toBe('BLOCKED');
    expect(d.failed).toContain('str-regulation');
    expect(d.headline).toBe('Blocked by a failed critical gate');
  });

  it('unresolved at an early stage → RESEARCH_CANDIDATE', () => {
    const records = allManual('PASS');
    records.pop(); // leave evidence-quality unrecorded → NEEDS_VERIFICATION
    const d = decide('researching', records);
    expect(d.classification).toBe('RESEARCH_CANDIDATE');
    expect(d.unresolved).toContain('evidence-quality');
    expect(d.canQualify).toBe(false);
  });

  it('unresolved at final-audit → HOLD_UNRESOLVED', () => {
    const records = allManual('PASS');
    records.pop();
    const d = decide('final-audit', records);
    expect(d.classification).toBe('HOLD_UNRESOLVED');
    expect(d.headline).toBe(
      'On hold — unresolved critical gates block final qualification',
    );
  });

  it('NOT_APPLICABLE counts as satisfied → QUALIFIED', () => {
    const records = allManual('PASS').map((r) =>
      r.category === 'hoa' ? { ...r, status: 'NOT_APPLICABLE' as GateStatus } : r,
    );
    const d = decide('final-audit', records);
    expect(d.classification).toBe('QUALIFIED');
    expect(d.canQualify).toBe(true);
    expect(d.headline).toBe(
      'Meets every critical gate — eligible for acquisition approval',
    );
  });

  it('FAIL at qualified stage still reports BLOCKED (no auto-move)', () => {
    const records = allManual('PASS');
    records[3] = record('hoa', 'FAIL');
    const d = decide('qualified', records);
    expect(d.classification).toBe('BLOCKED');
  });
});
