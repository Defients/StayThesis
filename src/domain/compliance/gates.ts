import type {
  GateCategory,
  GateRecord,
  GateResult,
  PlanningPreferences,
  ScenarioKey,
  ScenarioResult,
} from '../types';

export interface GateDefinition {
  category: GateCategory;
  label: string;
  mode: 'manual' | 'calculated';
}

/**
 * Hard-gate table (spec §2) — table order matters; all ten are critical.
 */
export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  { category: 'str-regulation', label: 'STR regulatory feasibility', mode: 'manual' },
  { category: 'zoning', label: 'Property-specific zoning', mode: 'manual' },
  { category: 'permit', label: 'Permit eligibility', mode: 'manual' },
  { category: 'hoa', label: 'HOA / building restrictions', mode: 'manual' },
  { category: 'landlord-authorization', label: 'Landlord authorization', mode: 'manual' },
  { category: 'lease-permission', label: 'Lease permission (sublet / STR clause)', mode: 'manual' },
  { category: 'insurance', label: 'STR-appropriate insurance', mode: 'manual' },
  { category: 'capital-feasibility', label: 'Capital feasibility', mode: 'calculated' },
  { category: 'conservative-performance', label: 'Conservative-case performance', mode: 'calculated' },
  { category: 'evidence-quality', label: 'Evidence quality', mode: 'manual' },
];

export const MANUAL_GATE_CATEGORIES: readonly GateCategory[] = GATE_DEFINITIONS
  .filter((d) => d.mode === 'manual')
  .map((d) => d.category);

export function isCalculatedGate(category: GateCategory): boolean {
  return GATE_DEFINITIONS.find((d) => d.category === category)?.mode === 'calculated';
}

export function gateLabel(category: GateCategory): string {
  return GATE_DEFINITIONS.find((d) => d.category === category)?.label ?? category;
}

import { formatCurrency } from '@/lib/format';

const money = (n: number) => formatCurrency(n);

/**
 * Merge manual gate records with the two calculated gates (spec §2).
 * `results` is the four-scenario output of computeAllScenarios.
 */
export function evaluateGates(
  records: GateRecord[],
  results: Record<ScenarioKey, ScenarioResult>,
  preferences: PlanningPreferences,
): GateResult[] {
  const byCategory = new Map(records.map((r) => [r.category, r]));
  const base = results.base;
  const conservative = results.conservative;

  return GATE_DEFINITIONS.map((def) => {
    if (def.mode === 'calculated') {
      if (def.category === 'capital-feasibility') {
        const requirement = base.capital.startupCashRequirement;
        const pass = requirement <= preferences.maxStartupExposure;
        return {
          category: def.category,
          label: def.label,
          critical: true,
          mode: def.mode,
          status: pass ? 'PASS' : 'FAIL',
          note: `Startup cash requirement ${money(requirement)} vs max exposure ${money(preferences.maxStartupExposure)}`,
          updatedAt: '',
          updatedBy: 'system' as const,
        };
      }
      // conservative-performance
      const annualOcf = conservative.annual.operatingCashFlow;
      const monthlyAfterFin = conservative.monthlyAverage.afterFinancingCashFlow;
      const tolerance = -preferences.tempLossTolerancePerMonth;
      const pass = annualOcf >= 0 && monthlyAfterFin >= tolerance;
      return {
        category: def.category,
        label: def.label,
        critical: true,
        mode: def.mode,
        status: pass ? 'PASS' : 'FAIL',
        note: `Conservative OCF ${money(annualOcf)}/yr and ${money(monthlyAfterFin)}/mo after financing vs tolerance ${money(tolerance)}`,
        updatedAt: '',
        updatedBy: 'system' as const,
      };
    }

    const record = byCategory.get(def.category);
    return {
      category: def.category,
      label: def.label,
      critical: true,
      mode: def.mode,
      // Unknown ≠ approved: a missing record stays unverified.
      status: record?.status ?? 'NEEDS_VERIFICATION',
      note: record?.note ?? '',
      updatedAt: record?.updatedAt ?? '',
      updatedBy: record?.updatedBy ?? 'system',
    };
  });
}
