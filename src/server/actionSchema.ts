import { z } from 'zod';
import type { Action } from '@/app/store/reducer';
import { SCENARIO_FIELDS, STARTUP_FIELDS, FINANCING_FIELDS, MODEL_FIELDS,
  PREFERENCE_LABELS, WEIGHT_LABELS } from '@/app/store/fieldMeta';
import { GATE_DEFINITIONS } from '@/domain/compliance/gates';
import { STAGES } from '@/domain/crm/stages';

const text = z.string().max(10000);
const name = z.string().trim().min(1).max(300);
const id = z.string().min(1).max(150);
const partner = z.enum(['partner-a', 'partner-b']);
const number = z.number().finite().min(0).max(1e9);
const category = z.enum(GATE_DEFINITIONS.map(g => g.category));
const date = z.iso.datetime().nullable();
const sourceUrl = z.url().max(2048).refine(s => /^https?:\/\//i.test(s)).nullable();
const numericPatch = (keys: string[]) => z.object(Object.fromEntries(keys.map(key => [key, number.optional()]))).strict();

export const captureSchema = z.object({
  entityId: id, metric: name, value: z.union([text, z.number().finite()]),
  units: text.nullable(), definition: text, sourceName: name, sourceUrl,
  retrievedAt: date, effectiveAt: date, observationPeriod: text.nullable(),
  notes: text, gateCategory: category.nullable(),
}).strict();

const property = { propertyId: id };
const numericField = { ...property, value: number };
const actions = [
  z.object({ type: z.literal('TOGGLE_SAVED'), ...property }).strict(),
  z.object({ type: z.literal('MOVE_STAGE'), ...property, stage: z.enum(STAGES.map(s => s.id)) }).strict(),
  z.object({ type: z.literal('ASSIGN_PARTNER'), ...property, partnerId: partner.nullable() }).strict(),
  z.object({ type: z.literal('ADD_NOTE'), ...property, text: name.or(text.trim().min(1)) }).strict(),
  z.object({ type: z.literal('UPDATE_SCENARIO_FIELD'), ...numericField,
    scenario: z.enum(['conservative', 'base', 'upside', 'stress']), field: z.enum(Object.keys(SCENARIO_FIELDS)) }).strict(),
  z.object({ type: z.literal('UPDATE_STARTUP_FIELD'), ...numericField, field: z.enum(Object.keys(STARTUP_FIELDS)) }).strict(),
  z.object({ type: z.literal('UPDATE_FINANCING_FIELD'), ...numericField, field: z.enum(Object.keys(FINANCING_FIELDS)) }).strict(),
  z.object({ type: z.literal('UPDATE_MODEL_FIELD'), ...numericField, field: z.enum(Object.keys(MODEL_FIELDS)) }).strict(),
  z.object({ type: z.literal('RESET_UNDERWRITING'), ...property }).strict(),
  z.object({ type: z.literal('SET_GATE_STATUS'), ...property, category,
    status: z.enum(['PASS', 'FAIL', 'NEEDS_VERIFICATION', 'NOT_APPLICABLE']), note: text.optional() }).strict(),
  z.object({ type: z.literal('SET_GATE_NOTE'), ...property, category, note: text }).strict(),
  z.object({ type: z.literal('TOGGLE_CHECKLIST_ITEM'), id }).strict(),
  z.object({ type: z.literal('ADD_EVIDENCE'), evidence: captureSchema }).strict(),
  z.object({ type: z.literal('UPDATE_EVIDENCE'), id, patch: z.object({
    classification: z.enum(['VERIFIED', 'CALCULATED', 'ESTIMATED', 'UNVERIFIED', 'OPERATOR_CLAIM']).optional(),
    reviewStatus: z.enum(['UNREVIEWED', 'IN_REVIEW', 'REVIEWED', 'REJECTED']).optional(),
    historyState: z.enum(['CURRENT', 'STALE', 'SUPERSEDED', 'DISPUTED', 'INCORRECT']).optional(),
    notes: text.optional(),
  }).strict() }).strict(),
  z.object({ type: z.literal('ADD_TASK'), task: z.object({ propertyId: id.nullable(), title: name,
    assigneeId: partner, dueDate: z.iso.date() }).strict() }).strict(),
  z.object({ type: z.literal('TOGGLE_TASK'), id }).strict(),
  z.object({ type: z.literal('DECIDE_APPROVAL'), id, decision: z.enum(['PENDING', 'APPROVED', 'DECLINED']) }).strict(),
  z.object({ type: z.literal('REQUEST_APPROVAL'), ...property,
    kind: z.enum(['startup-budget', 'lease-commitment', 'credit-use']), title: name, amount: number.optional() }).strict(),
  z.object({ type: z.literal('CREATE_OUTREACH_DRAFT'), ...property }).strict(),
  z.object({ type: z.literal('UPDATE_PREFERENCES'), patch: numericPatch(Object.keys(PREFERENCE_LABELS)
    .filter(k => k !== 'midTermFallbackDays')).extend({ midTermFallbackDays: z.object({ min: number, max: number }).strict().optional() }) }).strict(),
  z.object({ type: z.literal('UPDATE_SCORE_WEIGHTS'), patch: numericPatch(Object.keys(WEIGHT_LABELS)) }).strict(),
] as const;

export const sharedActionSchema = z.discriminatedUnion('type', actions);
export const requestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('load'), workspaceId: z.uuid() }).strict(),
  z.object({ operation: z.literal('mutate'), workspaceId: z.uuid(), version: z.number().int().min(0),
    requestId: z.uuid(), action: sharedActionSchema }).strict(),
]);

export function parseSharedAction(input: unknown): Action {
  return sharedActionSchema.parse(input) as Action;
}
