"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { SalesPlanContent, SalesPlanInputs } from "@/lib/types";
import { DEFAULT_PLAN_INPUTS, computeFunnel } from "@/lib/funnel";
import { deletePlan, generatePlan, savePlan } from "@/app/actions/products";
import { ActionButton, ErrorText, Spinner } from "@/components/actions";
import { Badge, Card, List, fmtMoney } from "@/components/ui";

const INPUTS: { key: keyof SalesPlanInputs; label: string; suffix?: string; prefix?: string; hint?: string }[] = [
  { key: "revenue_target", label: "New revenue target", prefix: "$" },
  { key: "period_months", label: "Period", suffix: "months" },
  { key: "acv", label: "Average contract value", prefix: "$" },
  { key: "win_rate", label: "Win rate (qualified opp → won)", suffix: "%" },
  { key: "meeting_to_opp", label: "First meeting → qualified opp", suffix: "%" },
  { key: "account_to_meeting", label: "Worked account → meeting", suffix: "%" },
  { key: "sales_cycle_days", label: "Sales cycle", suffix: "days" },
  { key: "sellers", label: "Sellers" },
  { key: "touches_per_account", label: "Touches per account", hint: "Across email, phone, LinkedIn" },
];

type PlanRow = { id: string; name: string; inputs: SalesPlanInputs; plan: SalesPlanContent; created_at: string };

export function PlanStudio({
  productId,
  plans,
  plan,
  foundationApproved,
}: {
  productId: string;
  plans: { id: string; name: string }[];
  plan: PlanRow | null;
  foundationApproved: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(plan?.name ?? `Plan ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`);
  const [inputs, setInputs] = useState<SalesPlanInputs>({ ...DEFAULT_PLAN_INPUTS, ...(plan?.inputs ?? {}) });
  const [busy, setBusy] = useState<"save" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const f = useMemo(() => computeFunnel(inputs), [inputs]);
  const content = plan?.plan && Object.keys(plan.plan).length ? plan.plan : null;

  async function save(thenGenerate: boolean) {
    setError(null);
    setBusy(thenGenerate ? "generate" : "save");
    const res = await savePlan(productId, plan?.id ?? null, name, inputs);
    if (!res.ok) {
      setBusy(null);
      return setError(res.error);
    }
    const id = res.data!;
    if (thenGenerate) {
      const g = await generatePlan(id);
      if (!g.ok) setError(g.error);
    }
    setBusy(null);
    if (!plan || plan.id !== id) router.push(`/products/${productId}/plan?plan=${id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {plans.map((p) => (
          <Link
            key={p.id}
            href={`/products/${productId}/plan?plan=${p.id}`}
            className={clsx("rounded-full px-3 py-1 text-sm", plan?.id === p.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}
          >
            {p.name}
          </Link>
        ))}
        <Link href={`/products/${productId}/plan?plan=new`} className={clsx("rounded-full px-3 py-1 text-sm", !plan ? "bg-slate-900 text-white" : "font-medium text-slate-700 hover:bg-slate-100")}>
          + New plan
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Assumptions" className="lg:col-span-2">
          <div className="space-y-3">
            <label className="block">
              <span className="label">Plan name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INPUTS.map((i) => (
                <label key={i.key} className="block">
                  <span className="label">{i.label}</span>
                  <div className="flex items-center gap-1">
                    {i.prefix && <span className="text-sm text-slate-400">{i.prefix}</span>}
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={inputs[i.key]}
                      onChange={(e) => setInputs({ ...inputs, [i.key]: Number(e.target.value) })}
                    />
                    {i.suffix && <span className="text-xs text-slate-400">{i.suffix}</span>}
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">All assumptions are editable and are shown to the AI as assumptions, not facts.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn" disabled={!!busy} onClick={() => save(false)}>
                {busy === "save" && <Spinner />} Save
              </button>
              <button className="btn btn-primary" disabled={!!busy} onClick={() => save(true)}>
                {busy === "generate" && <Spinner />} {content ? "Regenerate 30/60/90 plan" : "Generate 30/60/90 plan"}
              </button>
              {plan && (
                <ActionButton className="btn-danger" confirmText="Delete plan?" action={() => deletePlan(plan.id, productId)} onDone={() => router.push(`/products/${productId}/plan`)}>
                  Delete
                </ActionButton>
              )}
            </div>
            {!foundationApproved && <p className="text-xs text-amber-700">Tip: approve the Sales Foundation first so the plan uses verified positioning.</p>}
            <ErrorText error={error} />
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card title="What it takes">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Closed deals", v: f.deals },
                { l: "Qualified opps", v: f.opportunities },
                { l: "First meetings", v: f.meetings },
                { l: "Target accounts", v: f.accounts },
              ].map((x) => (
                <div key={x.l} className="rounded-md bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">{x.l}</div>
                  <div className="text-xl font-semibold tabular-nums">{x.v.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                Selling weeks: <b>{f.sellingWeeks}</b> of {f.weeks} <span className="text-xs text-slate-400">(cycle reserved at end)</span>
              </div>
              <div>
                New accounts / week: <b>{f.accountsPerWeek.toFixed(1)}</b>
              </div>
              <div>
                Meetings / week: <b>{f.meetingsPerWeek.toFixed(1)}</b>
              </div>
              <div>
                Touches / seller / week: <b>{Math.round(f.touchesPerSellerPerWeek)}</b>
              </div>
              <div>
                Pipeline to create: <b>{fmtMoney(f.pipelineValue)}</b> ({f.pipelineCoverage.toFixed(1)}× coverage)
              </div>
            </div>
            {f.warnings.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {f.warnings.map((w) => (
                  <div key={w} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {w}
                  </div>
                ))}
              </div>
            )}
          </Card>
          {content ? <PlanView plan={content} /> : <p className="muted">Generate the plan to get segments, campaigns, weekly capacity, experiments and risks.</p>}
        </div>
      </div>
    </div>
  );
}

function PlanView({ plan }: { plan: SalesPlanContent }) {
  return (
    <div className="space-y-6">
      <Card title="Executive Plan Summary">
        <div className="rounded-lg border border-gold/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-4">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed font-medium text-slate-800">{plan.summary}</p>
        </div>
      </Card>

      <div>
        <div className="eyebrow mb-3 text-slate-700">30 / 60 / 90 Execution Phases</div>
        <div className="grid gap-4 md:grid-cols-3">
          {plan.phases.map((p, idx) => (
            <Card
              key={p.label}
              title={
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{p.label}</span>
                </span>
              }
            >
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="eyebrow mb-1.5 text-slate-600">Goals</div>
                  <List items={p.goals} />
                </div>
                <div>
                  <div className="eyebrow mb-1.5 text-slate-600">Actions</div>
                  <List items={p.actions} />
                </div>
                <div>
                  <div className="eyebrow mb-1.5 text-emerald-800">Exit metrics</div>
                  <List items={p.exit_metrics} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card title="Priority Segments">
        <div className="grid gap-3 md:grid-cols-3">
          {plan.segments.map((s) => (
            <div key={s.name} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
              <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{s.why}</p>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                {s.triggers.map((t) => (
                  <Badge key={t} tone="violet">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Targeted Campaigns" pad={false}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Theme</th>
                <th>Segment</th>
                <th>Problem hypothesis</th>
                <th>Proof</th>
                <th>CTA</th>
                <th>Stop when</th>
              </tr>
            </thead>
            <tbody>
              {plan.campaigns.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="font-medium text-slate-900">{c.theme}</td>
                  <td>
                    <Badge tone="slate">{c.segment}</Badge>
                  </td>
                  <td className="max-w-xs text-xs text-slate-600">{c.problem_hypothesis}</td>
                  <td className="text-xs text-emerald-800 font-medium">{c.proof}</td>
                  <td>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800 font-mono">{c.cta}</span>
                  </td>
                  <td className="text-xs text-slate-500">{c.stop_conditions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Channel Mix">
          <List items={plan.channel_mix.map((c) => `${c.channel} — ${c.share}${c.notes ? ` · ${c.notes}` : ""}`)} />
        </Card>
        <Card title="Weekly Rep Capacity">
          <List items={plan.weekly_capacity.map((c) => `${c.owner}: ${c.activity} — ${c.per_week}`)} />
        </Card>
        <Card title="Leading Metrics & Review Cadence">
          <List items={[...plan.leading_metrics, ...plan.review_cadence]} />
        </Card>
        <Card title="Active Experiments">
          <List items={plan.experiments.map((e) => `${e.hypothesis} → ${e.test} (success: ${e.success_criteria})`)} />
        </Card>
        <Card title="Identified Risks & Mitigations">
          <List items={plan.risks.map((r) => `${r.risk} — ${r.mitigation}`)} />
        </Card>
        <Card title="Assumptions to Validate">
          <List items={plan.assumptions} />
        </Card>
      </div>
    </div>
  );
}
