import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Check, Copy, MailOpen, Stamp, X } from 'lucide-react';
import type {
  AcquisitionStage,
  ApprovalDecision,
  ApprovalRequest,
  PartnerId,
} from '@/domain/types';
import type { PropertyView } from '@/app/store/selectors';
import { STAGES } from '@/domain/crm/stages';
import { gateLabel } from '@/domain/compliance';
import { PARTNER_LIST, PARTNERS } from '@/data/demo/partners';
import {
  useActingPartner,
  useDispatch,
  useStore,
} from '@/app/store/StoreContext';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { DecisionPill, StagePill } from '@/components/property/pills';
import { formatCurrency } from '@/lib/format';
import { cx } from '@/lib/cx';

const APPROVAL_KINDS: { id: ApprovalRequest['kind']; label: string }[] = [
  { id: 'startup-budget', label: 'Startup budget' },
  { id: 'lease-commitment', label: 'Lease commitment' },
  { id: 'credit-use', label: 'Credit use' },
];

const APPROVAL_KIND_LABEL: Record<ApprovalRequest['kind'], string> = {
  'startup-budget': 'Startup budget',
  'lease-commitment': 'Lease commitment',
  'credit-use': 'Credit use',
};

const DECISION_TONE: Record<ApprovalDecision, string> = {
  APPROVED: 'text-positive',
  DECLINED: 'text-critical',
  PENDING: 'text-warning',
};

/**
 * Right-side property drawer — full-screen sheet on mobile, fixed-width
 * panel on desktop. Rendered via portal; Esc / backdrop / × closes.
 */
export function CrmDrawer({
  view,
  onClose,
}: {
  view: PropertyView;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const store = useStore();
  const { actingPartner } = useActingPartner();
  const panelRef = useRef<HTMLDivElement>(null);

  const [noteText, setNoteText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<PartnerId>('partner-a');
  const [taskDue, setTaskDue] = useState('');
  const [approvalKind, setApprovalKind] =
    useState<ApprovalRequest['kind']>('startup-budget');
  const [approvalTitle, setApprovalTitle] = useState('');
  const [approvalAmount, setApprovalAmount] = useState<number | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { property, pipeline, decision } = view;
  const drafts = useMemo(
    () =>
      store.outreach
        .filter((d) => d.propertyId === property.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.outreach, property.id],
  );
  const latestDraft = drafts[0] ?? null;
  const problemGates = [...decision.failed, ...decision.unresolved];

  const generateDraft = () => {
    dispatch({ type: 'CREATE_OUTREACH_DRAFT', propertyId: property.id });
    setCopied(false);
    setDraftOpen(true);
  };

  const copyDraft = async () => {
    if (!latestDraft) return;
    const text = `${latestDraft.subject}\n\n${latestDraft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Graceful fallback — clipboard unavailable (e.g. insecure context or
      // permission denied): select-all hint instead of an error.
      setCopied(false);
      window.prompt?.('Copy the draft below', text);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${property.name} details`}
        className={cx(
          'absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden',
          'border-l border-line bg-surface shadow-card sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {property.code} · Simulated CRM record
            </p>
            <h2 className="truncate font-display text-lg font-semibold text-ink">
              {property.name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <StagePill stage={pipeline.stage} />
              <DecisionPill classification={decision.classification} />
            </div>
          </div>
          <IconButton label="Close drawer" onClick={onClose}>
            <X aria-hidden className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto scroll-thin px-5 py-4">
          {/* Workflow ------------------------------------------------------ */}
          <section className="grid grid-cols-2 gap-3">
            <Select
              label="Stage"
              value={pipeline.stage}
              onChange={(e) =>
                dispatch({
                  type: 'MOVE_STAGE',
                  propertyId: property.id,
                  stage: e.target.value as AcquisitionStage,
                })
              }
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              label="Assignee"
              value={pipeline.assigneeId ?? ''}
              onChange={(e) =>
                dispatch({
                  type: 'ASSIGN_PARTNER',
                  propertyId: property.id,
                  partnerId: (e.target.value || null) as PartnerId | null,
                })
              }
            >
              <option value="">Unassigned</option>
              {PARTNER_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </section>

          {/* Decision ------------------------------------------------------ */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Decision
            </h3>
            <p className="mt-1 text-sm text-ink">{decision.headline}</p>
            {problemGates.length > 0 && (
              <ul className="mt-2 space-y-1">
                {problemGates.map((g) => (
                  <li
                    key={g}
                    className={cx(
                      'text-xs',
                      decision.failed.includes(g)
                        ? 'text-critical'
                        : 'text-warning',
                    )}
                  >
                    {decision.failed.includes(g) ? 'Failed' : 'Unresolved'} —{' '}
                    {gateLabel(g)}
                  </li>
                ))}
              </ul>
            )}
            <Link
              to={`/property/${property.id}/compliance`}
              className="mt-2 inline-block text-xs font-medium text-cyan hover:underline"
            >
              Open compliance workspace →
            </Link>
          </section>

          {/* Notes --------------------------------------------------------- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Notes
            </h3>
            {pipeline.notes.length === 0 ? (
              <p className="mt-1 text-xs text-muted">No notes yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {[...pipeline.notes].reverse().map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-line bg-sunken px-3 py-2"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                      {PARTNERS[n.author].name} ·{' '}
                      {new Date(n.at).toLocaleDateString()}
                    </p>
                    <p className="mt-0.5 text-sm text-ink">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteText.trim()) return;
                dispatch({
                  type: 'ADD_NOTE',
                  propertyId: property.id,
                  text: noteText,
                });
                setNoteText('');
              }}
            >
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                aria-label="Note text"
                className="h-9 flex-1 rounded-lg border border-line bg-sunken px-3 text-sm text-ink placeholder:text-muted"
              />
              <Button type="submit" size="sm" variant="secondary">
                Add
              </Button>
            </form>
          </section>

          {/* Tasks --------------------------------------------------------- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Tasks
            </h3>
            {view.tasks.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                No tasks for this property.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {view.tasks.map((t) => (
                  <li key={t.id} className={cx(t.done && 'opacity-60')}>
                    <Checkbox
                      checked={t.done}
                      onChange={() =>
                        dispatch({ type: 'TOGGLE_TASK', id: t.id })
                      }
                      label={`${t.title} — ${PARTNERS[t.assigneeId].initials} · due ${t.dueDate}`}
                    />
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 space-y-2 rounded-lg border border-line bg-sunken p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskTitle.trim() || !taskDue) return;
                dispatch({
                  type: 'ADD_TASK',
                  task: {
                    propertyId: property.id,
                    title: taskTitle,
                    assigneeId: taskAssignee,
                    dueDate: taskDue,
                  },
                });
                setTaskTitle('');
                setTaskDue('');
              }}
            >
              <TextInput
                label="New task"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call landlord about clause 8.2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Assignee"
                  value={taskAssignee}
                  onChange={(e) =>
                    setTaskAssignee(e.target.value as PartnerId)
                  }
                >
                  {PARTNER_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <TextInput
                  label="Due date"
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Add task
              </Button>
            </form>
          </section>

          {/* Approvals ----------------------------------------------------- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Approvals
            </h3>
            {view.approvals.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                No approval requests yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {view.approvals.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-line bg-sunken px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="text-xs tabular-nums text-secondary">
                        {formatCurrency(a.amount)}
                      </p>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">
                      {APPROVAL_KIND_LABEL[a.kind]} · requested by{' '}
                      {PARTNERS[a.requestedBy].name}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {PARTNER_LIST.map((p) => {
                        const d = a.decisions[p.id];
                        const own = p.id === actingPartner.id;
                        return (
                          <div
                            key={p.id}
                            className="rounded-lg border border-line px-2 py-1.5"
                          >
                            <p className="text-[10px] font-medium text-muted">
                              {p.name}
                              {own ? ' (you)' : ''}
                            </p>
                            {own ? (
                              <div className="mt-1 flex gap-1">
                                <Button
                                  size="sm"
                                  variant={
                                    d === 'APPROVED' ? 'primary' : 'secondary'
                                  }
                                  onClick={() =>
                                    dispatch({
                                      type: 'DECIDE_APPROVAL',
                                      id: a.id,
                                      decision: 'APPROVED',
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    d === 'DECLINED' ? 'danger' : 'ghost'
                                  }
                                  onClick={() =>
                                    dispatch({
                                      type: 'DECIDE_APPROVAL',
                                      id: a.id,
                                      decision: 'DECLINED',
                                    })
                                  }
                                >
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <p
                                className={cx(
                                  'mt-1 text-xs font-semibold',
                                  DECISION_TONE[d],
                                )}
                              >
                                {d === 'APPROVED'
                                  ? 'Approved'
                                  : d === 'DECLINED'
                                    ? 'Declined'
                                    : 'Pending'}{' '}
                                <span className="font-normal text-muted">
                                  · read-only
                                </span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 space-y-2 rounded-lg border border-line bg-sunken p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!approvalTitle.trim()) return;
                dispatch({
                  type: 'REQUEST_APPROVAL',
                  propertyId: property.id,
                  kind: approvalKind,
                  title: approvalTitle,
                  ...(approvalAmount != null && { amount: approvalAmount }),
                });
                setApprovalTitle('');
                setApprovalAmount(null);
              }}
            >
              <p className="text-xs font-medium text-secondary">
                Request approval
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Kind"
                  value={approvalKind}
                  onChange={(e) =>
                    setApprovalKind(
                      e.target.value as ApprovalRequest['kind'],
                    )
                  }
                >
                  {APPROVAL_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </Select>
                <NumberField
                  label="Amount"
                  value={approvalAmount}
                  onChange={setApprovalAmount}
                  prefix="$"
                  hint="Defaults to BASE startup cash"
                />
              </div>
              <TextInput
                label="Title"
                value={approvalTitle}
                onChange={(e) => setApprovalTitle(e.target.value)}
                placeholder="e.g. Commit to 12-month lease"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Stamp aria-hidden className="h-3.5 w-3.5" />
                Request approval
              </Button>
              <p className="text-[10px] text-muted">
                Simulated approval — not authenticated.
              </p>
            </form>
          </section>

          {/* Outreach ------------------------------------------------------ */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Landlord outreach
            </h3>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={generateDraft}
            >
              <MailOpen aria-hidden className="h-3.5 w-3.5" />
              Generate outreach draft
            </Button>
            {drafts.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {drafts.map((d, i) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setDraftOpen(true)}
                      className="w-full truncate rounded-lg border border-line bg-sunken px-3 py-2 text-left text-xs text-secondary hover:border-line-strong"
                    >
                      Draft {drafts.length - i} — {d.subject}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted">
              No messages are sent in Phase 1 — drafts are review-only.
            </p>
          </section>

          <Link
            to={`/property/${property.id}`}
            className="inline-block pb-2 text-sm font-medium text-cyan hover:underline"
          >
            Open property workspace →
          </Link>
        </div>
      </div>

      {/* Draft preview dialog ------------------------------------------- */}
      {draftOpen && latestDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDraftOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Outreach draft"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
          >
            <div className="border-b border-line px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Draft — review only
              </p>
              <h3 className="mt-1 text-sm font-semibold text-ink">
                {latestDraft.subject}
              </h3>
            </div>
            <pre className="flex-1 overflow-y-auto scroll-thin whitespace-pre-wrap px-5 py-4 font-sans text-sm text-secondary">
              {latestDraft.body}
            </pre>
            <div className="space-y-2 border-t border-line px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={copyDraft}>
                  {copied ? (
                    <Check aria-hidden className="h-3.5 w-3.5 text-positive" />
                  ) : (
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy to clipboard'}
                </Button>
                <Button size="sm" variant="ghost" disabled>
                  Send — planned for Phase 2
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftOpen(false)}
                >
                  Close
                </Button>
              </div>
              <p className="text-[10px] text-muted">
                No messages are sent in Phase 1. The draft discloses intended
                STR/mid-term use — simulated workflow only.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
