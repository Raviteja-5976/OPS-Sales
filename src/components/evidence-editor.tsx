"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  BELIEFS,
  BELIEF_KEYS,
  SOURCE_LABELS,
  type BuyingRole,
  type DealEvidence,
  type Fact,
  type Metric,
  type SourceLabel,
  type Stakeholder,
} from "@/lib/types";
import { OBJECTION_PATTERNS } from "@/lib/playbook";
import { saveEvidence } from "@/app/actions/deals";
import { ErrorText, Spinner, useAction } from "./actions";
import { fmtMoney } from "./ui";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 px-4 py-5 last:border-b-0 sm:px-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint && <p className="mb-3 text-xs text-slate-500">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function SourceSelect({ value, onChange }: { value: SourceLabel; onChange: (v: SourceLabel) => void }) {
  return (
    <select
      className={clsx(
        "input w-40 shrink-0 text-xs",
        value === "buyer-confirmed" && "text-emerald-700",
        value === "ai-hypothesis" && "text-amber-700",
      )}
      value={value}
      onChange={(e) => onChange(e.target.value as SourceLabel)}
    >
      {SOURCE_LABELS.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  );
}

function FactList({ items, onChange, placeholder }: { items: Fact[]; onChange: (v: Fact[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" value={f.text} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          <SourceSelect value={f.source} onChange={(s) => onChange(items.map((x, j) => (j === i ? { ...x, source: s } : x)))} />
          <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...items, { text: "", source: "buyer-confirmed" }])}>
        + {placeholder}
      </button>
    </div>
  );
}

function MetricList({ items, onChange }: { items: Metric[]; onChange: (v: Metric[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((m, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" placeholder="Metric" value={m.label} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className="input w-36" placeholder="Value" value={m.value} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <SourceSelect value={m.source} onChange={(s) => onChange(items.map((x, j) => (j === i ? { ...x, source: s } : x)))} />
          <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...items, { label: "", value: "", source: "buyer-confirmed" }])}>
        + Metric
      </button>
    </div>
  );
}

function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" value={s} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...items, ""])}>
        + {placeholder}
      </button>
    </div>
  );
}

const num = (v: string) => (v === "" ? null : Number(v));

export function EvidenceEditor({ dealId, evidence, amount, currency }: { dealId: string; evidence: DealEvidence; amount: number | null; currency: string }) {
  const [e, setE] = useState<DealEvidence>(evidence);
  const [calc, setCalc] = useState({ baseline: "", target: "" });
  const { pending, error, exec } = useAction();
  const dirty = JSON.stringify(e) !== JSON.stringify(evidence);
  const set = <K extends keyof DealEvidence>(k: K, v: DealEvidence[K]) => setE({ ...e, [k]: v });

  const annualGap = e.value_gap.amount === null ? null : e.value_gap.cadence === "monthly" ? e.value_gap.amount * 12 : e.value_gap.amount;
  const ratio = annualGap && amount ? annualGap / amount : null;

  return (
    <div className="card">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-lg border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <div>
          <h2 className="h-section">Deal evidence record</h2>
          <p className="text-xs text-slate-500">Facts the buyer confirmed are kept apart from assumptions. Mark each item&apos;s source honestly.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600">Unsaved</span>}
          <button className="btn btn-primary" disabled={!dirty || pending} onClick={() => exec(() => saveEvidence(dealId, e))}>
            {pending && <Spinner />} Save evidence
          </button>
        </div>
      </div>
      <ErrorText error={error} />

      <Section title="Next step" hint="Specific, owned and dated. 'Follow up next week' is not a next step.">
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px]">
          <input className="input" placeholder="Purpose, e.g. 'Technical review with IT lead'" value={e.next_step.purpose ?? ""} onChange={(x) => set("next_step", { ...e.next_step, purpose: x.target.value || null })} />
          <input className="input" placeholder="Owner" value={e.next_step.owner ?? ""} onChange={(x) => set("next_step", { ...e.next_step, owner: x.target.value || null })} />
          <input className="input" type="date" value={e.next_step.date ?? ""} onChange={(x) => set("next_step", { ...e.next_step, date: x.target.value || null })} />
        </div>
      </Section>

      <Section title="Account fit">
        <div className="flex gap-2">
          <input className="input" value={e.account_fit.reason} placeholder="Why this account fits the ICP" onChange={(x) => set("account_fit", { ...e.account_fit, reason: x.target.value })} />
          <select className="input w-40" value={e.account_fit.status} onChange={(x) => set("account_fit", { ...e.account_fit, status: x.target.value as "hypothesis" | "confirmed" })}>
            <option value="hypothesis">hypothesis</option>
            <option value="confirmed">confirmed</option>
          </select>
        </div>
      </Section>

      <Section title="Current state (Point A)" hint="Verifiable operating facts and metrics — not opinions. Two or more to exit discovery.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="label">Facts</div>
            <FactList items={e.current_state.facts} onChange={(v) => set("current_state", { ...e.current_state, facts: v })} placeholder="Fact" />
          </div>
          <div>
            <div className="label">Metrics</div>
            <MetricList items={e.current_state.metrics} onChange={(v) => set("current_state", { ...e.current_state, metrics: v })} />
          </div>
        </div>
      </Section>

      <Section title="Desired state (Point B)" hint="Explicit, measurable and time-bound.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="label">Goals</div>
            <FactList items={e.desired_state.facts} onChange={(v) => set("desired_state", { ...e.desired_state, facts: v })} placeholder="Goal" />
          </div>
          <div>
            <div className="label">Target metrics</div>
            <MetricList items={e.desired_state.metrics} onChange={(v) => set("desired_state", { ...e.desired_state, metrics: v })} />
            <label className="mt-3 block">
              <span className="label">Target date</span>
              <input className="input w-48" type="date" value={e.desired_state.target_date ?? ""} onChange={(x) => set("desired_state", { ...e.desired_state, target_date: x.target.value || null })} />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Value gap & cost of inaction" hint="Use the buyer's numbers. Anything estimated stays labelled as an estimate.">
        <div className="mb-4 rounded-md bg-slate-50 p-3">
          <div className="label">Gap calculator (monthly value)</div>
          <div className="flex flex-wrap items-end gap-2">
            <input className="input w-36" type="number" placeholder="Baseline / mo" value={calc.baseline} onChange={(x) => setCalc({ ...calc, baseline: x.target.value })} />
            <span className="pb-2 text-slate-400">→</span>
            <input className="input w-36" type="number" placeholder="Target / mo" value={calc.target} onChange={(x) => setCalc({ ...calc, target: x.target.value })} />
            <button
              type="button"
              className="btn"
              disabled={!calc.baseline || !calc.target}
              onClick={() => {
                const gap = Number(calc.target) - Number(calc.baseline);
                set("value_gap", {
                  ...e.value_gap,
                  amount: gap,
                  cadence: "monthly",
                  assumptions: [...e.value_gap.assumptions, `Baseline ${calc.baseline}/mo → target ${calc.target}/mo`],
                });
              }}
            >
              Use as gap
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="label">Value gap</div>
            <div className="flex gap-2">
              <input className="input" type="number" value={e.value_gap.amount ?? ""} onChange={(x) => set("value_gap", { ...e.value_gap, amount: num(x.target.value) })} />
              <select className="input w-32" value={e.value_gap.cadence} onChange={(x) => set("value_gap", { ...e.value_gap, cadence: x.target.value as "monthly" | "annual" })}>
                <option value="monthly">/ month</option>
                <option value="annual">/ year</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-brand-600" checked={e.value_gap.buyer_confirmed} onChange={(x) => set("value_gap", { ...e.value_gap, buyer_confirmed: x.target.checked })} />
              Buyer confirmed this gap in their own words
            </label>
            {annualGap !== null && (
              <p className="text-xs text-slate-500">
                Annualized gap {fmtMoney(annualGap, currency)}
                {ratio !== null && (
                  <span className={ratio >= 3 ? "text-emerald-600" : "text-amber-600"}> · {ratio.toFixed(1)}× deal value {ratio >= 3 ? "(healthy)" : "(below 3× — price will feel heavy)"}</span>
                )}
              </p>
            )}
            <div className="label mt-2">Assumptions</div>
            <StringList items={e.value_gap.assumptions} onChange={(v) => set("value_gap", { ...e.value_gap, assumptions: v })} placeholder="Assumption" />
          </div>
          <div className="space-y-2">
            <div className="label">Cost of inaction (per month)</div>
            <div className="flex gap-2">
              <input className="input" type="number" value={e.cost_of_inaction.amount ?? ""} onChange={(x) => set("cost_of_inaction", { ...e.cost_of_inaction, amount: num(x.target.value) })} />
              <select className="input w-44" value={e.cost_of_inaction.confidence} onChange={(x) => set("cost_of_inaction", { ...e.cost_of_inaction, confidence: x.target.value as "estimate" | "buyer-confirmed" })}>
                <option value="estimate">estimate</option>
                <option value="buyer-confirmed">buyer-confirmed</option>
              </select>
            </div>
            {e.cost_of_inaction.amount ? (
              <p className="text-xs text-slate-500">
                Two quarters of delay ≈ {fmtMoney(e.cost_of_inaction.amount * 6, currency)}
                {e.cost_of_inaction.confidence === "estimate" && " (estimate — confirm with the buyer)"}
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Roadblocks & prior attempts" hint="Why hasn't the buyer solved this already? This must come from the buyer.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="label">Roadblocks</div>
            <FactList items={e.roadblocks} onChange={(v) => set("roadblocks", v)} placeholder="Roadblock" />
          </div>
          <div>
            <div className="label">Prior attempts</div>
            <FactList items={e.prior_attempts} onChange={(v) => set("prior_attempts", v)} placeholder="Attempt" />
          </div>
        </div>
      </Section>

      <Section title="Stakeholders" hint="Map economic buyer, champion, evaluators and blockers. Two or more avoids single-threading.">
        <div className="space-y-2">
          {e.stakeholders.map((s, i) => {
            const up = (p: Partial<Stakeholder>) => set("stakeholders", e.stakeholders.map((x, j) => (j === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_150px_120px_auto]">
                <input className="input" placeholder="Name" value={s.name} onChange={(x) => up({ name: x.target.value })} />
                <input className="input" placeholder="Title" value={s.title} onChange={(x) => up({ title: x.target.value })} />
                <select className="input" value={s.role} onChange={(x) => up({ role: x.target.value as BuyingRole })}>
                  {["economic_buyer", "champion", "end_user", "technical_evaluator", "procurement", "influencer", "unknown"].map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <select className="input" value={s.stance} onChange={(x) => up({ stance: x.target.value as Stakeholder["stance"] })}>
                  {["champion", "supporter", "neutral", "blocker", "unknown"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => set("stakeholders", e.stakeholders.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => set("stakeholders", [...e.stakeholders, { name: "", title: "", role: "unknown", stance: "unknown", source: "buyer-confirmed" }])}
          >
            + Stakeholder
          </button>
        </div>
      </Section>

      <Section title="Decision process">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="label">Decision criteria</div>
            <StringList items={e.decision_process.criteria} onChange={(v) => set("decision_process", { ...e.decision_process, criteria: v })} placeholder="Criterion" />
          </div>
          <div>
            <div className="label">People involved</div>
            <StringList items={e.decision_process.people} onChange={(v) => set("decision_process", { ...e.decision_process, people: v })} placeholder="Person" />
          </div>
          <label className="block">
            <span className="label">Decision date</span>
            <input className="input w-48" type="date" value={e.decision_process.date ?? ""} onChange={(x) => set("decision_process", { ...e.decision_process, date: x.target.value || null })} />
          </label>
          <label className="block">
            <span className="label">Procurement / security / legal steps</span>
            <input className="input" value={e.decision_process.procurement} onChange={(x) => set("decision_process", { ...e.decision_process, procurement: x.target.value })} />
          </label>
        </div>
      </Section>

      <Section title="Seven buying beliefs" hint="A diagnostic lens, not a scorecard of the person. Score only with evidence; leave blank if unknown.">
        <div className="space-y-3">
          {BELIEF_KEYS.map((k) => {
            const b = e.buying_beliefs[k];
            const up = (p: Partial<typeof b>) => set("buying_beliefs", { ...e.buying_beliefs, [k]: { ...b, ...p } });
            return (
              <div key={k} className="grid gap-2 sm:grid-cols-[180px_160px_1fr] sm:items-center">
                <div>
                  <div className="text-sm font-medium">{BELIEFS[k].label}</div>
                  <div className="text-[11px] text-slate-500">{BELIEFS[k].conviction}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={b.score ?? 0}
                    onChange={(x) => up({ score: Number(x.target.value) })}
                    className={clsx("w-24 accent-brand-600", b.score === null && "opacity-40")}
                  />
                  <span className={clsx("w-8 text-sm tabular-nums", b.score === null ? "text-slate-400" : b.score >= 8 ? "text-emerald-600" : b.score >= 5 ? "text-amber-600" : "text-red-600")}>
                    {b.score ?? "–"}
                  </span>
                  {b.score !== null && (
                    <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600" onClick={() => up({ score: null })}>
                      clear
                    </button>
                  )}
                </div>
                <input className="input" placeholder={`Evidence · Ask: "${BELIEFS[k].question}"`} value={b.evidence} onChange={(x) => up({ evidence: x.target.value })} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Objections" hint="Trace each objection to the missing belief or upstream stage rather than rebutting it.">
        <div className="space-y-2">
          {e.objections.map((o, i) => {
            const up = (p: Partial<typeof o>) => set("objections", e.objections.map((x, j) => (j === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_150px_150px_110px_auto]">
                <input className="input" value={o.text} onChange={(x) => up({ text: x.target.value })} placeholder="What the buyer said" />
                <select className="input" value={o.missing_belief ?? ""} onChange={(x) => up({ missing_belief: x.target.value as never })}>
                  <option value="">Missing belief?</option>
                  {BELIEF_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {BELIEFS[k].label}
                    </option>
                  ))}
                </select>
                <input className="input" value={o.origin_stage} onChange={(x) => up({ origin_stage: x.target.value })} placeholder="Origin stage" />
                <select className="input" value={o.status} onChange={(x) => up({ status: x.target.value as "open" | "resolved" })}>
                  <option value="open">open</option>
                  <option value="resolved">resolved</option>
                </select>
                <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => set("objections", e.objections.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-1.5">
            {OBJECTION_PATTERNS.map((p) => (
              <button
                key={p.key}
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  set("objections", [
                    ...e.objections,
                    { text: p.statement, category: p.key, origin_stage: p.primaryOrigin, missing_belief: p.missingBelief, status: "open", at: new Date().toISOString() },
                  ])
                }
              >
                + {p.statement}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Mutual action plan & commitments" hint="Owners from both sides, with dates.">
        <div className="space-y-2">
          {e.commitments.map((c, i) => {
            const up = (p: Partial<typeof c>) => set("commitments", e.commitments.map((x, j) => (j === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[auto_1fr_160px_150px_auto] sm:items-center">
                <input type="checkbox" className="accent-brand-600" checked={c.done} onChange={(x) => up({ done: x.target.checked })} />
                <input className={clsx("input", c.done && "line-through opacity-60")} value={c.text} onChange={(x) => up({ text: x.target.value })} placeholder="Step" />
                <input className="input" value={c.owner} onChange={(x) => up({ owner: x.target.value })} placeholder="Owner" />
                <input className="input" type="date" value={c.due ?? ""} onChange={(x) => up({ due: x.target.value || null })} />
                <button type="button" className="btn btn-ghost btn-sm text-slate-400" onClick={() => set("commitments", e.commitments.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            );
          })}
          <button type="button" className="btn btn-sm" onClick={() => set("commitments", [...e.commitments, { text: "", owner: "", due: null, done: false }])}>
            + Step
          </button>
        </div>
      </Section>
    </div>
  );
}
