import { describe, expect, it } from 'vitest';
import type { Decision, Market, Property } from '../types';
import { canMoveToStage, STAGES } from './stages';
import { generateOutreachDraft } from './outreach';
import { evaluateDecision } from '../compliance';
import { evaluateGates } from '../compliance';
import { computeAllScenarios } from '../finance';
import { fixtureF } from '../finance/fixture';
import { DEFAULT_PREFERENCES } from '../preferences';

const decisionFor = (canQualify: boolean): Decision => ({
  classification: canQualify ? 'QUALIFIED' : 'RESEARCH_CANDIDATE',
  canQualify,
  failed: canQualify ? [] : [],
  unresolved: canQualify ? [] : ['zoning'],
  score: { total: 60, factors: {} as never, band: 'promising' },
  headline: '',
  risks: [],
});

describe('STAGES', () => {
  it('lists all 12 stages in pipeline order ending at rejected', () => {
    expect(STAGES).toHaveLength(12);
    expect(STAGES[0]!.id).toBe('discovered');
    expect(STAGES[STAGES.length - 1]!.id).toBe('rejected');
  });
});

describe('canMoveToStage (spec §3)', () => {
  it('refuses a move to qualified when the decision cannot qualify', () => {
    const r = canMoveToStage('qualified', decisionFor(false));
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('allows a move to qualified when every gate is satisfied', () => {
    expect(canMoveToStage('qualified', decisionFor(true)).allowed).toBe(true);
  });

  it('allows any other move including rejected', () => {
    expect(canMoveToStage('rejected', decisionFor(false)).allowed).toBe(true);
    expect(canMoveToStage('researching', decisionFor(false)).allowed).toBe(true);
  });
});

describe('generateOutreachDraft', () => {
  const property = { name: 'Ashgrove Craftsman Two-Bed', bedrooms: 2, bathrooms: 1 } as Property;
  const market = { city: 'Columbus', stateCode: 'OH' } as Market;
  const partner = {
    id: 'partner-b',
    name: 'Sam Rivera',
    initials: 'SR',
    focus: 'Markets & landlord relations',
  } as const;

  const draft = generateOutreachDraft(property, market, partner);

  it('names the property in the subject', () => {
    expect(draft.subject).toContain('Ashgrove Craftsman Two-Bed');
  });

  it('explicitly discloses the intended use and conditions', () => {
    expect(draft.body).toContain('short-term');
    expect(draft.body).toContain('30');
    expect(draft.body).toContain('written authorization');
    expect(draft.body).toMatch(/sublet/i);
    expect(draft.body).toContain('under 30 nights');
    expect(draft.body).toContain('30–90 nights');
  });

  it('mentions operating standards and offers terms', () => {
    expect(draft.body).toMatch(/professional cleaning/i);
    expect(draft.body).toMatch(/guest screening/i);
    expect(draft.body).toMatch(/insurance/i);
    expect(draft.body).toMatch(/house rules/i);
    expect(draft.body).toContain('Hello,');
  });

  it('claims no approvals and names no landlord', () => {
    expect(draft.body).not.toMatch(/approved|pre-approved/i);
    expect(draft.body).not.toContain('Dear ');
  });
});

describe('decision integration (fixture F)', () => {
  it('fixture F with no manual records → RESEARCH_CANDIDATE at underwriting', () => {
    const results = computeAllScenarios(fixtureF());
    const gates = evaluateGates([], results, DEFAULT_PREFERENCES);
    const d = evaluateDecision({
      stage: 'underwriting',
      gates,
      score: { total: 55, factors: {} as never, band: 'weak' },
      results,
      preferences: DEFAULT_PREFERENCES,
    });
    expect(d.classification).toBe('RESEARCH_CANDIDATE');
  });
});
