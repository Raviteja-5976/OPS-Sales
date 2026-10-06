"use client";

import { useState } from "react";
import clsx from "clsx";
import { DEAL_STAGES, BELIEFS, type BeliefKey, type DealDiagnosis, type DealEvidence, type DealStage, type ProposalDraft, type Task } from "@/lib/types";
import type { DealHealth } from "@/lib/readiness";
import { addTask, diagnoseDeal, draftProposal, moveStage, toggleTask, updateDealFields } from "@/app/actions/deals";
import { ActionButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Card, List, fmtDate } from "@/components/ui";
import { DocView, type Json } from "@/components/json-doc";

export function StageControl({ dealId, stage, health, outcomeReason }: { dealId: string; stage: DealStage; health: DealHealth; outcomeReason: string | null }) {
  const [target, setTarget] = useState<DealStage | null>(null);
  const [reason, setReason] = useState("");
  const { pending, error, setError, exec } = useAction();
  const order = DEAL_STAGES.map((s) => s.key);
  const needsReason = (s: DealStage) =>
    ["lost", "nurture"].includes(s) || ((order.indexOf(s) > order.indexOf(stage) || s === "won") && health.status !== "ready");

  function choose(s: DealStage) {
    if (s === stage) return;
    setError(null);
    if (needsReason(s)) {
      setTarget(s);
      setReason("");
    } else exec(() => moveStage(dealId, s));
  }

  const idx = order.indexOf(stage);
  const journey = DEAL_STAGES.filter((s) => s.open);
  const outcomes = DEAL_STAGES.filter((s) => !s.open);

  return (
    <div className="card p-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {journey.map((s, i) => {
            const current = s.key === stage;
            const passed = order.indexOf(s.key) < idx && DEAL_STAGES[idx]?.open !== false;
            return (
              <div key={s.key} className="flex flex-1 items-center">
                <button
                  onClick={() => choose(s.key)}
                  disabled={pending}
                  title={current ? "Current stage" : `Move to ${s.label}`}
                  className={clsx(
                    "flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-200",
                    current ? "bg-gold text-on-gold" : passed ? "text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                  )}
                >
                  <span className="num font-mono text-[10px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                  {passed && <span className="text-[11px] text-emerald-700">✓</span>}
                  {s.label}
                </button>
                {i < journey.length - 1 && <span className={clsx("mx-0.5 h-px w-4 shrink-0", passed || current ? "bg-gold" : "bg-slate-200")} aria-hidden />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
          {outcomes.map((s) => (
            <button
              key={s.key}
              onClick={() => choose(s.key)}
              disabled={pending}
              className={clsx(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                s.key === stage
                  ? s.key === "won"
                    ? "bg-emerald-600 text-white"
                    : s.key === "lost"
                      ? "bg-red-600 text-white"
                      : "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {target && (
        <div className="mt-1.5 animate-rise rounded-md border border-amber-200 bg-amber-50 p-3">
          {["lost", "nurture"].includes(target) ? (
            <p className="text-sm text-amber-900">Record why, with evidence. This feeds loss-reason analysis and the Sales Foundation.</p>
          ) : (
            <div className="text-sm text-amber-900">
              <b>{health.status === "missing" ? "Missing critical evidence" : "Proceed with caution"}.</b> Not yet met:{" "}
              {health.checks
                .filter((c) => !c.ok)
                .map((c) => c.label)
                .join("; ")}
              . You can proceed — state why so it can inform coaching.
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <input className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
            <button className="btn btn-primary" disabled={!reason.trim() || pending} onClick={() => exec(() => moveStage(dealId, target, reason), () => setTarget(null))}>
              {pending && <Spinner />} Move to {target}
            </button>
            <button className="btn" onClick={() => setTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <ErrorText error={error} />
      {outcomeReason && ["won", "lost", "nurture"].includes(stage) && <p className="px-2 pt-2 text-xs text-slate-500">Reason: {outcomeReason}</p>}
    </div>
  );
}

export function DealFields({ dealId, name, amount, closeDate, currency }: { dealId: string; name: string; amount: number | null; closeDate: string | null; currency: string }) {
  const [v, setV] = useState({ name, amount: amount?.toString() ?? "", close_date: closeDate ?? "", currency });
  const { pending, error, exec } = useAction();
  const dirty = v.name !== name || v.amount !== (amount?.toString() ?? "") || v.close_date !== (closeDate ?? "") || v.currency !== currency;
  return (
    <Card title="Deal details">
      <div className="space-y-2">
        <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <div className="flex gap-2">
          <input className="input" type="number" placeholder="Amount" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
          <select className="input w-24" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
            {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <input className="input" type="date" value={v.close_date} onChange={(e) => setV({ ...v, close_date: e.target.value })} />
        <button
          className="btn w-full"
          disabled={!dirty || pending}
          onClick={() =>
            exec(() =>
              updateDealFields(dealId, {
                name: v.name,
                amount: v.amount ? Number(v.amount) : null,
                close_date: v.close_date || null,
                currency: v.currency,
              }),
            )
          }
        >
          Save details
        </button>
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

export function TasksPanel({ dealId, accountId, tasks }: { dealId: string; accountId: string; tasks: Task[] }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [owner, setOwner] = useState("");
  const { pending, error, exec } = useAction();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card title="Tasks & commitments">
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-brand-600" checked={t.done} onChange={(e) => exec(() => toggleTask(t.id, e.target.checked))} />
            <div className={clsx("min-w-0", t.done && "text-slate-400 line-through")}>
              {t.title}
              <div className="text-xs text-slate-500">
                {t.owner_label && `${t.owner_label} · `}
                <span className={!t.done && t.due_date && t.due_date < today ? "text-red-600" : ""}>{t.due_date ? fmtDate(t.due_date) : "no date"}</span>
                {t.source !== "manual" && ` · from ${t.source}`}
              </div>
            </div>
          </li>
        ))}
        {!tasks.length && <li className="muted">No tasks.</li>}
      </ul>
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <input className="input" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button
            className="btn"
            disabled={!title.trim() || pending}
            onClick={() =>
              exec(
                () => addTask({ title, dealId, accountId, due, owner }),
                () => {
                  setTitle("");
                  setDue("");
                  setOwner("");
                },
              )
            }
          >
            Add
          </button>
        </div>
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

function proposalReadiness(e: DealEvidence) {
  const items = [
    { label: "Current state", ok: e.current_state.facts.length + e.current_state.metrics.length >= 2 },
    { label: "Desired state", ok: e.desired_state.metrics.length > 0 && !!e.desired_state.target_date },
    { label: "Value case", ok: (e.value_gap.amount ?? 0) > 0 && e.value_gap.buyer_confirmed },
    { label: "Roadblocks", ok: e.roadblocks.some((r) => r.source === "buyer-confirmed") },
    { label: "Stakeholders", ok: e.stakeholders.some((s) => s.role === "economic_buyer") },
    { label: "Procurement", ok: !!e.decision_process.procurement },
    { label: "Decision date", ok: !!e.decision_process.date },
    { label: "Implementation owner", ok: e.commitments.some((c) => c.owner && c.due) },
  ];
  return { items, pct: Math.round((items.filter((i) => i.ok).length / items.length) * 100) };
}

export function DealWorkspaceTabs({
  evidenceSlot,
  diagnosisSlot,
  proposalSlot,
  executionSlot,
  hasDiagnosis,
  hasProposal,
}: {
  evidenceSlot: React.ReactNode;
  diagnosisSlot: React.ReactNode;
  proposalSlot: React.ReactNode;
  executionSlot: React.ReactNode;
  hasDiagnosis: boolean;
  hasProposal: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"evidence" | "strategy" | "proposal" | "execution">("evidence");

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("evidence")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "evidence"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Evidence & Readiness</span>
        </button>
        <button
          onClick={() => setActiveTab("strategy")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "strategy"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>AI Strategy & Diagnosis</span>
          {hasDiagnosis && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
        </button>
        <button
          onClick={() => setActiveTab("proposal")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "proposal"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Proposal Studio</span>
          {hasProposal && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        </button>
        <button
          onClick={() => setActiveTab("execution")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "execution"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Activity & Checklists</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "evidence" && <div className="space-y-6 animate-rise">{evidenceSlot}</div>}
      {activeTab === "strategy" && <div className="space-y-6 animate-rise">{diagnosisSlot}</div>}
      {activeTab === "proposal" && <div className="space-y-6 animate-rise">{proposalSlot}</div>}
      {activeTab === "execution" && <div className="space-y-6 animate-rise">{executionSlot}</div>}
    </div>
  );
}

export function DealAI({
  dealId,
  diagnosis,
  presentation,
  evidence,
}: {
  dealId: string;
  diagnosis: DealDiagnosis | null;
  presentation: DealHealth["presentation"];
  evidence: DealEvidence;
}) {
  return (
    <Card
      title="Deal diagnosis"
      actions={
        <ActionButton className="btn-sm btn-primary" action={() => diagnoseDeal(dealId)} pendingText="Reading the evidence…">
          {diagnosis ? "Re-run diagnosis" : "Diagnose this deal"}
        </ActionButton>
      }
    >
      {!diagnosis ? (
        <p className="muted">
          Reads the evidence record through the seven-beliefs lens: where the deal is weakest, why, and which question would test it.
        </p>
      ) : (
        <div className="space-y-5 text-sm">
          {/* Executive Diagnosis Summary */}
          <div className="rounded-xl border border-gold/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-4">
            <div className="eyebrow mb-1 text-gold-deep">Deal Executive Summary</div>
            <p className="text-[14px] leading-relaxed font-medium text-slate-800">{diagnosis.summary}</p>
          </div>

          {diagnosis.weakest_beliefs.length > 0 && (
            <div>
              <div className="eyebrow mb-2.5 text-slate-700">Weakest Buying Beliefs</div>
              <div className="space-y-2.5">
                {diagnosis.weakest_beliefs.map((b, i) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900 text-sm">
                        ◐ {BELIEFS[b.belief as BeliefKey]?.label ?? b.belief}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Belief Gap
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{b.why}</p>
                    <div className="rounded-lg border border-amber-300/60 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-sm">
                      ⚡ <span className="font-semibold text-amber-900">Recommended Ask:</span> “{b.question}”
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2 text-rose-800">Risks & Red Flags</div>
              <List items={diagnosis.risks} empty="No critical risks flagged." />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2 text-slate-700">Questions For The Next Call</div>
              <List items={diagnosis.questions_for_next_call} empty="None." />
            </div>
          </div>

          {diagnosis.generated_at && (
            <div className="pt-2 text-right text-[11px] text-slate-400">
              Diagnosis generated {fmtDate(diagnosis.generated_at, true)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function ProposalPanel({
  dealId,
  proposal,
  presentation,
  evidence,
}: {
  dealId: string;
  proposal: ProposalDraft | null;
  presentation: DealHealth["presentation"];
  evidence: DealEvidence;
}) {
  const readiness = proposalReadiness(evidence);

  return (
    <Card
      title="Proposal workspace"
      actions={
        <ActionButton className="btn-sm btn-primary" action={() => draftProposal(dealId)} pendingText="Drafting from evidence…">
          {proposal ? "Redraft proposal" : "Draft proposal from evidence"}
        </ActionButton>
      }
    >
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow">Proposal Readiness</div>
            <div className={clsx("num mt-1 text-[26px] font-semibold leading-none", readiness.pct >= 75 ? "text-slate-900" : "text-amber-600")}>
              {readiness.pct}%
            </div>
          </div>
          <div className="w-48">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={clsx("h-full transition-all duration-300", readiness.pct >= 75 ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${readiness.pct}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 pt-2 border-t border-slate-200/60">
          {readiness.items.map((i) => (
            <li key={i.label} className={clsx("flex items-center gap-1.5", i.ok ? "text-slate-700 font-medium" : "text-amber-700")}>
              <span>{i.ok ? "✓" : "⚠"}</span>
              <span>{i.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {!presentation.unlocked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
          <strong>A polished proposal shouldn&apos;t hide incomplete discovery.</strong> Still missing: {presentation.reasons.join(" ")}{" "}
          <a href="#evidence" className="font-semibold underline ml-1">
            Resolve missing evidence
          </a>
        </div>
      )}

      {!proposal ? (
        <p className="muted">
          Drafts from confirmed evidence only: value case, solution elements mapped to roadblocks, scope, exclusions, options and a mutual action plan.
        </p>
      ) : (
        <div className="space-y-4">
          {proposal.unverified_claims.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              <b>Verify before sending:</b> {proposal.unverified_claims.join("; ")}
            </div>
          )}
          <DocView value={proposal as unknown as Json} />
        </div>
      )}
    </Card>
  );
}
