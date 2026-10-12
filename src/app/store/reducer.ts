import type {
  AcquisitionStage,
  ActivityKind,
  ApprovalDecision,
  ApprovalRequest,
  EvidenceRecord,
  FinancingAssumptions,
  GateCategory,
  GateStatus,
  PartnerId,
  PlanningPreferences,
  PropertyId,
  ScenarioAssumptions,
  ScenarioKey,
  ScoreWeights,
  StartupCosts,
} from '@/domain/types';
import { evaluateProperty } from '@/domain/evaluate';
import { canMoveToStage, stageLabel } from '@/domain/crm/stages';
import { generateOutreachDraft } from '@/domain/crm/outreach';
import { gateLabel, isCalculatedGate } from '@/domain/compliance/gates';
import { updateScenarioField } from '@/domain/finance';
import { createId } from '@/lib/ids';
import { nowIso } from '@/lib/clock';
import { marketById } from '@/data/demo/markets';
import { propertyById } from '@/data/demo/properties';
import { buildSeedModel } from '@/data/demo/seed';
import { PARTNERS } from '@/data/demo/partners';
import {
  FINANCING_FIELDS,
  MODEL_FIELDS,
  PREFERENCE_LABELS,
  SCENARIO_FIELDS,
  SCENARIO_LABELS,
  STARTUP_FIELDS,
  WEIGHT_LABELS,
} from './fieldMeta';
import { createInitialState, type DemoState, type Notice } from './state';

export type Action =
  | { type: 'RESET_DEMO' }
  | { type: 'SET_ACTING_PARTNER'; partnerId: PartnerId }
  | { type: 'TOGGLE_SAVED'; propertyId: PropertyId }
  | { type: 'TOGGLE_COMPARE'; propertyId: PropertyId }
  | { type: 'CLEAR_COMPARE' }
  | { type: 'MOVE_STAGE'; propertyId: PropertyId; stage: AcquisitionStage }
  | { type: 'ASSIGN_PARTNER'; propertyId: PropertyId; partnerId: PartnerId | null }
  | { type: 'ADD_NOTE'; propertyId: PropertyId; text: string }
  | {
      type: 'UPDATE_SCENARIO_FIELD';
      propertyId: PropertyId;
      scenario: ScenarioKey;
      field: keyof ScenarioAssumptions;
      value: number;
    }
  | {
      type: 'UPDATE_STARTUP_FIELD';
      propertyId: PropertyId;
      field: keyof StartupCosts;
      value: number;
    }
  | {
      type: 'UPDATE_FINANCING_FIELD';
      propertyId: PropertyId;
      field: keyof FinancingAssumptions;
      value: number;
    }
  | {
      type: 'UPDATE_MODEL_FIELD';
      propertyId: PropertyId;
      field: 'launchMonth' | 'reserveMonths' | 'blockedNightsPerMonth';
      value: number;
    }
  | { type: 'RESET_UNDERWRITING'; propertyId: PropertyId }
  | {
      type: 'SET_GATE_STATUS';
      propertyId: PropertyId;
      category: GateCategory;
      status: GateStatus;
      note?: string;
    }
  | {
      type: 'SET_GATE_NOTE';
      propertyId: PropertyId;
      category: GateCategory;
      note: string;
    }
  | { type: 'TOGGLE_CHECKLIST_ITEM'; id: string }
  | {
      type: 'UPDATE_EVIDENCE';
      id: string;
      patch: Partial<
        Pick<
          EvidenceRecord,
          'classification' | 'reviewStatus' | 'historyState' | 'notes'
        >
      >;
    }
  | {
      type: 'ADD_TASK';
      task: { propertyId: PropertyId | null; title: string; assigneeId: PartnerId; dueDate: string };
    }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'DECIDE_APPROVAL'; id: string; decision: ApprovalDecision }
  | {
      type: 'REQUEST_APPROVAL';
      propertyId: PropertyId;
      kind: ApprovalRequest['kind'];
      title: string;
      /** Defaults to the BASE startup cash requirement when omitted. */
      amount?: number;
    }
  | { type: 'CREATE_OUTREACH_DRAFT'; propertyId: PropertyId }
  | { type: 'UPDATE_PREFERENCES'; patch: Partial<PlanningPreferences> }
  | { type: 'UPDATE_SCORE_WEIGHTS'; patch: Partial<ScoreWeights> }
  | { type: 'SET_LAST_VIEWED'; propertyId: PropertyId }
  | { type: 'DISMISS_NOTICE' };

const COMPARE_LIMIT = 3;

function notice(state: DemoState, n: Notice): DemoState {
  return { ...state, notice: n };
}

function refuse(state: DemoState, message: string): DemoState {
  return notice(state, { tone: 'warning', message });
}

/** Prepend an activity event for a partner-initiating mutation. */
function log(
  state: DemoState,
  kind: ActivityKind,
  message: string,
  propertyId: PropertyId | null = null,
): DemoState {
  return {
    ...state,
    activity: [
      {
        id: createId('act'),
        at: nowIso(),
        actor: state.actingPartnerId,
        propertyId,
        kind,
        message,
      },
      ...state.activity,
    ],
  };
}

/**
 * Log a per-field update ("Updated Base ADR to $165"). High-frequency edits
 * fire per keystroke — when the newest event is the same actor updating the
 * same field on the same record, replace it (fresh timestamp) instead of
 * flooding the log.
 */
function logUpdate(
  state: DemoState,
  kind: ActivityKind,
  propertyId: PropertyId | null,
  prefix: string,
  message: string,
): DemoState {
  const [head, ...rest] = state.activity;
  if (
    head &&
    head.actor === state.actingPartnerId &&
    head.kind === kind &&
    head.propertyId === propertyId &&
    head.message.startsWith(prefix)
  ) {
    return {
      ...state,
      activity: [{ ...head, at: nowIso(), message }, ...rest],
    };
  }
  return log(state, kind, message, propertyId);
}

function patchPipeline(
  state: DemoState,
  propertyId: PropertyId,
  patch: Partial<DemoState['pipeline'][string]>,
): DemoState {
  const record = state.pipeline[propertyId];
  if (!record) return state;
  return {
    ...state,
    pipeline: {
      ...state.pipeline,
      [propertyId]: { ...record, ...patch },
    },
  };
}

function patchUnderwriting(
  state: DemoState,
  propertyId: PropertyId,
  patch: (model: DemoState['underwriting'][string]) => DemoState['underwriting'][string],
): DemoState {
  const model = state.underwriting[propertyId];
  if (!model) return state;
  return {
    ...state,
    underwriting: { ...state.underwriting, [propertyId]: patch(model) },
  };
}

/** Current derived decision for a property (drives stage-move rules). */
function currentDecision(state: DemoState, propertyId: PropertyId) {
  const property = propertyById(propertyId);
  const pipeline = state.pipeline[propertyId];
  const model = state.underwriting[propertyId];
  if (!property || !pipeline || !model) return null;
  return evaluateProperty({
    property,
    model,
    gateRecords: state.gates[propertyId] ?? [],
    evidence: state.evidence.filter((e) => e.entityId === propertyId),
    stage: pipeline.stage,
    preferences: state.preferences,
    weights: state.scoreWeights,
  }).decision;
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'RESET_DEMO':
      return createInitialState();

    case 'DISMISS_NOTICE':
      return state.notice ? { ...state, notice: null } : state;

    case 'SET_ACTING_PARTNER': {
      if (action.partnerId === state.actingPartnerId) return state;
      const partner = PARTNERS[action.partnerId];
      return {
        ...log(state, 'system', `Switched acting identity to ${partner.name}`),
        actingPartnerId: action.partnerId,
      };
    }

    case 'SET_LAST_VIEWED':
      return state.lastViewedPropertyId === action.propertyId
        ? state
        : { ...state, lastViewedPropertyId: action.propertyId };

    case 'TOGGLE_SAVED': {
      const record = state.pipeline[action.propertyId];
      if (!record) return state;
      const saved = !record.saved;
      const next = patchPipeline(state, action.propertyId, { saved });
      return log(
        next,
        'saved',
        saved
          ? `Saved ${propertyById(action.propertyId)?.name ?? action.propertyId}`
          : `Unsaved ${propertyById(action.propertyId)?.name ?? action.propertyId}`,
        action.propertyId,
      );
    }

    case 'TOGGLE_COMPARE': {
      if (state.compare.includes(action.propertyId))
        return {
          ...state,
          compare: state.compare.filter((id) => id !== action.propertyId),
        };
      if (state.compare.length >= COMPARE_LIMIT)
        return refuse(state, `Compare is limited to ${COMPARE_LIMIT} properties`);
      return { ...state, compare: [...state.compare, action.propertyId] };
    }

    case 'CLEAR_COMPARE':
      return state.compare.length ? { ...state, compare: [] } : state;

    case 'MOVE_STAGE': {
      const record = state.pipeline[action.propertyId];
      if (!record || record.stage === action.stage) return state;
      const decision = currentDecision(state, action.propertyId);
      if (decision) {
        const check = canMoveToStage(action.stage, decision);
        if (!check.allowed) return refuse(state, check.reason ?? 'Move refused');
      }
      const next = patchPipeline(state, action.propertyId, {
        stage: action.stage,
        stageChangedAt: nowIso(),
      });
      return log(
        next,
        'stage-change',
        `Moved ${propertyById(action.propertyId)?.name ?? action.propertyId} to ${stageLabel(action.stage)}`,
        action.propertyId,
      );
    }

    case 'ASSIGN_PARTNER': {
      const name = action.partnerId ? PARTNERS[action.partnerId].name : 'Unassigned';
      const next = patchPipeline(state, action.propertyId, {
        assigneeId: action.partnerId,
      });
      return log(
        next,
        'assignment',
        `Assigned ${propertyById(action.propertyId)?.name ?? action.propertyId} to ${name}`,
        action.propertyId,
      );
    }

    case 'ADD_NOTE': {
      const record = state.pipeline[action.propertyId];
      if (!record || !action.text.trim()) return state;
      const next = patchPipeline(state, action.propertyId, {
        notes: [
          ...record.notes,
          {
            id: createId('note'),
            author: state.actingPartnerId,
            at: nowIso(),
            text: action.text.trim(),
          },
        ],
      });
      return log(next, 'note', 'Added a note', action.propertyId);
    }

    case 'UPDATE_SCENARIO_FIELD': {
      const next = patchUnderwriting(state, action.propertyId, (m) =>
        updateScenarioField(m, action.scenario, action.field, action.value),
      );
      const meta = SCENARIO_FIELDS[action.field];
      const prefix = `Updated ${SCENARIO_LABELS[action.scenario]} ${meta.label}`;
      return logUpdate(
        next,
        'underwriting-change',
        action.propertyId,
        prefix,
        `${prefix} to ${meta.format(action.value)}`,
      );
    }

    case 'UPDATE_STARTUP_FIELD': {
      const next = patchUnderwriting(state, action.propertyId, (m) => ({
        ...m,
        startup: { ...m.startup, [action.field]: action.value },
      }));
      const meta = STARTUP_FIELDS[action.field];
      const prefix = `Updated ${meta.label}`;
      return logUpdate(
        next,
        'underwriting-change',
        action.propertyId,
        prefix,
        `${prefix} to ${meta.format(action.value)}`,
      );
    }

    case 'UPDATE_FINANCING_FIELD': {
      const next = patchUnderwriting(state, action.propertyId, (m) => ({
        ...m,
        financing: { ...m.financing, [action.field]: action.value },
      }));
      const meta = FINANCING_FIELDS[action.field];
      const prefix = `Updated ${meta.label}`;
      return logUpdate(
        next,
        'underwriting-change',
        action.propertyId,
        prefix,
        `${prefix} to ${meta.format(action.value)}`,
      );
    }

    case 'UPDATE_MODEL_FIELD': {
      const next = patchUnderwriting(state, action.propertyId, (m) => ({
        ...m,
        [action.field]: action.value,
      }));
      const meta = MODEL_FIELDS[action.field];
      const prefix = `Updated ${meta.label}`;
      return logUpdate(
        next,
        'underwriting-change',
        action.propertyId,
        prefix,
        `${prefix} to ${meta.format(action.value)}`,
      );
    }

    case 'RESET_UNDERWRITING': {
      const model = buildSeedModel(action.propertyId);
      if (!model) return state;
      const next = {
        ...state,
        underwriting: { ...state.underwriting, [action.propertyId]: model },
      };
      return log(next, 'underwriting-change', 'Reset underwriting to seed', action.propertyId);
    }

    case 'SET_GATE_STATUS': {
      if (isCalculatedGate(action.category))
        return refuse(
          state,
          `${gateLabel(action.category)} is calculated — it changes with underwriting, not by hand`,
        );
      const records = state.gates[action.propertyId] ?? [];
      const existing = records.find((r) => r.category === action.category);
      const updated: typeof records = existing
        ? records.map((r) =>
            r.category === action.category
              ? {
                  ...r,
                  status: action.status,
                  note: action.note ?? r.note,
                  updatedAt: nowIso(),
                  updatedBy: state.actingPartnerId,
                }
              : r,
          )
        : [
            ...records,
            {
              category: action.category,
              status: action.status,
              note: action.note ?? '',
              updatedAt: nowIso(),
              updatedBy: state.actingPartnerId,
            },
          ];
      const next = { ...state, gates: { ...state.gates, [action.propertyId]: updated } };
      return log(
        next,
        'gate-change',
        `Marked ${gateLabel(action.category)} ${action.status}`,
        action.propertyId,
      );
    }

    case 'SET_GATE_NOTE': {
      if (isCalculatedGate(action.category))
        return refuse(
          state,
          `${gateLabel(action.category)} is calculated — its note is generated`,
        );
      const records = state.gates[action.propertyId] ?? [];
      const updated = records.map((r) =>
        r.category === action.category
          ? { ...r, note: action.note, updatedAt: nowIso(), updatedBy: state.actingPartnerId }
          : r,
      );
      const next = { ...state, gates: { ...state.gates, [action.propertyId]: updated } };
      const prefix = `Updated note on ${gateLabel(action.category)}`;
      return logUpdate(next, 'gate-change', action.propertyId, prefix, prefix);
    }

    case 'TOGGLE_CHECKLIST_ITEM': {
      const item = state.checklist.find((c) => c.id === action.id);
      if (!item) return state;
      const next = {
        ...state,
        checklist: state.checklist.map((c) =>
          c.id === action.id ? { ...c, done: !c.done } : c,
        ),
      };
      return log(next, 'system', `Checklist item ${item.done ? 'reopened' : 'completed'}`, item.propertyId);
    }

    case 'UPDATE_EVIDENCE': {
      const record = state.evidence.find((e) => e.id === action.id);
      if (!record) return state;
      const auditActions: string[] = [];
      if (
        action.patch.classification !== undefined &&
        action.patch.classification !== record.classification
      )
        auditActions.push(
          `Classification ${record.classification} → ${action.patch.classification}`,
        );
      if (
        action.patch.historyState !== undefined &&
        action.patch.historyState !== record.historyState
      )
        auditActions.push(
          `History ${record.historyState} → ${action.patch.historyState}`,
        );
      if (
        action.patch.reviewStatus !== undefined &&
        action.patch.reviewStatus !== record.reviewStatus
      )
        auditActions.push(`Marked ${action.patch.reviewStatus}`);
      if (action.patch.notes !== undefined && action.patch.notes !== record.notes)
        auditActions.push('Note updated');
      if (auditActions.length === 0) return state;
      const nextRecord: EvidenceRecord = {
        ...record,
        ...(action.patch.classification !== undefined && {
          classification: action.patch.classification,
        }),
        ...(action.patch.historyState !== undefined && {
          historyState: action.patch.historyState,
        }),
        ...(action.patch.notes !== undefined && { notes: action.patch.notes }),
        ...(action.patch.reviewStatus !== undefined && {
          reviewStatus: action.patch.reviewStatus,
          reviewer:
            action.patch.reviewStatus === 'REVIEWED'
              ? state.actingPartnerId
              : record.reviewer,
        }),
        audit: [
          ...record.audit,
          {
            at: nowIso(),
            actor: state.actingPartnerId,
            action: auditActions.join('; '),
          },
        ],
      };
      const next = {
        ...state,
        evidence: state.evidence.map((e) => (e.id === action.id ? nextRecord : e)),
      };
      // Nothing becomes VERIFIED automatically — an explicit classification
      // change is the only path to VERIFIED.
      return log(next, 'evidence-change', `Updated evidence: ${record.metric}`, record.entityId);
    }

    case 'ADD_TASK': {
      const next = {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: createId('task'),
            propertyId: action.task.propertyId,
            title: action.task.title,
            assigneeId: action.task.assigneeId,
            dueDate: action.task.dueDate,
            done: false,
          },
        ],
      };
      return log(next, 'task', `Added task "${action.task.title}"`, action.task.propertyId);
    }

    case 'TOGGLE_TASK': {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      const next = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t,
        ),
      };
      return log(next, 'task', `${task.done ? 'Reopened' : 'Completed'} task "${task.title}"`, task.propertyId);
    }

    case 'DECIDE_APPROVAL': {
      const approval = state.approvals.find((a) => a.id === action.id);
      if (!approval) return state;
      // A partner decides only their own slot.
      const next = {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.id
            ? {
                ...a,
                decisions: {
                  ...a.decisions,
                  [state.actingPartnerId]: action.decision,
                },
              }
            : a,
        ),
      };
      const decisionLabel =
        action.decision === 'APPROVED'
          ? 'approved'
          : action.decision === 'DECLINED'
            ? 'declined'
            : 'reset to pending on';
      return log(
        next,
        'approval',
        `${PARTNERS[state.actingPartnerId].name} ${decisionLabel} "${approval.title}"`,
        approval.propertyId,
      );
    }

    case 'REQUEST_APPROVAL': {
      const property = propertyById(action.propertyId);
      const pipeline = state.pipeline[action.propertyId];
      const model = state.underwriting[action.propertyId];
      if (!property || !pipeline || !model || !action.title.trim())
        return state;
      const baseCapital = evaluateProperty({
        property,
        model,
        gateRecords: state.gates[action.propertyId] ?? [],
        evidence: state.evidence.filter(
          (e) => e.entityId === action.propertyId,
        ),
        stage: pipeline.stage,
        preferences: state.preferences,
        weights: state.scoreWeights,
      }).results.base.capital;
      const amount =
        action.amount !== undefined &&
        Number.isFinite(action.amount) &&
        action.amount >= 0
          ? action.amount
          : baseCapital.startupCashRequirement;
      const request: ApprovalRequest = {
        id: createId('approval'),
        propertyId: action.propertyId,
        kind: action.kind,
        title: action.title.trim(),
        amount,
        requestedBy: state.actingPartnerId,
        createdAt: nowIso(),
        decisions: { 'partner-a': 'PENDING', 'partner-b': 'PENDING' },
      };
      const next = { ...state, approvals: [...state.approvals, request] };
      return log(
        next,
        'approval',
        `${PARTNERS[state.actingPartnerId].name} requested approval — "${request.title}"`,
        action.propertyId,
      );
    }

    case 'CREATE_OUTREACH_DRAFT': {
      const property = propertyById(action.propertyId);
      if (!property) return state;
      const market = marketById(property.marketId);
      if (!market) return state;
      const partner = PARTNERS[state.actingPartnerId];
      const draft = generateOutreachDraft(property, market, partner);
      const next = {
        ...state,
        outreach: [
          ...state.outreach,
          {
            id: createId('outreach'),
            propertyId: property.id,
            author: partner.id,
            createdAt: nowIso(),
            subject: draft.subject,
            body: draft.body,
            status: 'DRAFT' as const,
          },
        ],
      };
      return log(next, 'outreach', `Drafted landlord outreach for ${property.name}`, property.id);
    }

    case 'UPDATE_PREFERENCES': {
      // Sanitize: numeric fields must be finite and ≥ 0.
      const patch: Partial<PlanningPreferences> = {};
      const changed: (keyof PlanningPreferences)[] = [];
      for (const [key, value] of Object.entries(action.patch) as [
        keyof PlanningPreferences,
        unknown,
      ][]) {
        if (key === 'midTermFallbackDays') {
          const v = value as PlanningPreferences['midTermFallbackDays'];
          if (
            v &&
            Number.isFinite(v.min) &&
            Number.isFinite(v.max) &&
            v.min >= 0 &&
            v.max >= 0
          ) {
            patch.midTermFallbackDays = { min: v.min, max: v.max };
            changed.push(key);
          }
          continue;
        }
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          Object.assign(patch, { [key]: value });
          changed.push(key);
        }
      }
      if (changed.length === 0) return state;
      const next = {
        ...state,
        preferences: { ...state.preferences, ...patch },
      };
      const names = changed.map((k) => PREFERENCE_LABELS[k]).join(', ');
      const prefix = `Updated ${names}`;
      const details = changed
        .map((k) =>
          k === 'midTermFallbackDays'
            ? `${patch.midTermFallbackDays!.min}–${patch.midTermFallbackDays!.max} nights`
            : String(patch[k as keyof PlanningPreferences]),
        )
        .join(', ');
      return logUpdate(next, 'system', null, prefix, `${prefix} to ${details}`);
    }

    case 'UPDATE_SCORE_WEIGHTS': {
      const patch: Partial<ScoreWeights> = {};
      const changed: (keyof ScoreWeights)[] = [];
      for (const [key, value] of Object.entries(action.patch) as [
        keyof ScoreWeights,
        unknown,
      ][]) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          Object.assign(patch, { [key]: value });
          changed.push(key);
        }
      }
      if (changed.length === 0) return state;
      const next = {
        ...state,
        scoreWeights: { ...state.scoreWeights, ...patch },
      };
      const names = changed.map((k) => WEIGHT_LABELS[k]).join(', ');
      const prefix = `Updated weight ${names}`;
      const details = changed
        .map((k) => String(patch[k as keyof ScoreWeights]))
        .join(', ');
      return logUpdate(next, 'system', null, prefix, `${prefix} to ${details}`);
    }

    default:
      return state;
  }
}
