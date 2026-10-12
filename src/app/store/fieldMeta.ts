import type {
  FinancingAssumptions,
  PlanningPreferences,
  ScenarioAssumptions,
  ScoreWeights,
  StartupCosts,
} from '@/domain/types';
import { formatCurrency, formatPercent } from '@/lib/format';

export interface FieldMeta {
  label: string;
  format: (v: number) => string;
}

const money: FieldMeta['format'] = (v) => formatCurrency(v);
const pct = (v: number) => formatPercent(v);
const plain = (v: number) => String(v);

export const SCENARIO_FIELDS: Record<keyof ScenarioAssumptions, FieldMeta> = {
  adr: { label: 'ADR', format: money },
  occupancyRate: { label: 'Occupancy', format: pct },
  averageLengthOfStay: { label: 'Avg length of stay', format: (v) => `${v} nights` },
  cleaningFeePerStay: { label: 'Cleaning fee / stay', format: money },
  ancillaryRevenuePerStay: { label: 'Ancillary / stay', format: money },
  discountRate: { label: 'Discount rate', format: pct },
  platformFeeRate: { label: 'Platform fee', format: pct },
  paymentProcessingRate: { label: 'Processing rate', format: pct },
  occupancyTaxRate: { label: 'Occupancy tax', format: pct },
  rent: { label: 'Rent', format: money },
  utilities: { label: 'Utilities', format: money },
  internet: { label: 'Internet', format: money },
  insurance: { label: 'Insurance', format: money },
  software: { label: 'Software', format: money },
  maintenance: { label: 'Maintenance', format: money },
  furnitureReplacement: { label: 'Furniture replacement', format: money },
  permitLicense: { label: 'Permit / license', format: money },
  otherFixed: { label: 'Other fixed', format: money },
  cleaningCostPerTurnover: { label: 'Cleaning cost / turnover', format: money },
  laundryCostPerTurnover: { label: 'Laundry / turnover', format: money },
  suppliesPerTurnover: { label: 'Supplies / turnover', format: money },
};

export const STARTUP_FIELDS: Record<keyof StartupCosts, FieldMeta> = {
  firstMonthRent: { label: 'First month rent', format: money },
  securityDeposit: { label: 'Security deposit', format: money },
  furnishing: { label: 'Furnishing', format: money },
  equipment: { label: 'Equipment', format: money },
  locks: { label: 'Locks', format: money },
  supplies: { label: 'Supplies', format: money },
  photography: { label: 'Photography', format: money },
  permitSetup: { label: 'Permit setup', format: money },
  contingency: { label: 'Contingency', format: money },
};

export const FINANCING_FIELDS: Record<keyof FinancingAssumptions, FieldMeta> = {
  creditFundedAmount: { label: 'Credit funded', format: money },
  upfrontFeeRate: { label: 'Upfront fee', format: pct },
  promoApr: { label: 'Promo APR', format: pct },
  promoMonths: { label: 'Promo months', format: plain },
  postPromoApr: { label: 'Post-promo APR', format: pct },
  plannedRepaymentMonths: { label: 'Planned repayment', format: (v) => `${v} mo` },
};

export const MODEL_FIELDS: Record<
  'launchMonth' | 'reserveMonths' | 'blockedNightsPerMonth',
  FieldMeta
> = {
  launchMonth: { label: 'Launch month', format: plain },
  reserveMonths: { label: 'Reserve months', format: plain },
  blockedNightsPerMonth: { label: 'Blocked nights / mo', format: plain },
};

export const PREFERENCE_LABELS: Record<keyof PlanningPreferences, string> = {
  preferredStartupExposure: 'preferred startup exposure',
  maxStartupExposure: 'max startup exposure',
  reserveMonths: 'reserve months',
  maxMonthlyRent: 'max monthly rent',
  targetMonthlyProfit: 'target monthly profit',
  preferredPaybackMonths: 'preferred payback months',
  tempLossTolerancePerMonth: 'temporary loss tolerance / mo',
  tempLossToleranceMonths: 'temporary loss tolerance months',
  targetCashOnCash: 'target cash-on-cash',
  targetRevenueToRent: 'target revenue ÷ rent',
  midTermFallbackDays: 'mid-term fallback days',
};

export const WEIGHT_LABELS: Record<keyof ScoreWeights, string> = {
  financialStrength: 'financial strength',
  guestExperience: 'guest experience',
  aesthetics: 'aesthetics',
  location: 'location',
  demandStability: 'demand stability',
  operationalSimplicity: 'operational simplicity',
  evidenceConfidence: 'evidence confidence',
};

export const SCENARIO_LABELS: Record<string, string> = {
  base: 'Base',
  upside: 'Upside',
  conservative: 'Conservative',
  stress: 'Stress',
};
