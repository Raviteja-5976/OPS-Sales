import { getContext } from "@/lib/context";
import { normalizeEvidence } from "@/lib/evidence";
import { computeDealHealth } from "@/lib/readiness";
import { FUNNEL_DIAGNOSTICS, OBJECTION_PATTERNS } from "@/lib/playbook";
import { BELIEFS, DEAL_STAGES, type BeliefKey, type Call, type CheckResult, type Deal } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Card, NextBestAction, PageHeader, Signals, Stat, fmtDate, fmtMoney } from "@/components/ui";

/** Single-series magnitude bars: one hue, value in ink, hover title on each row. */
function Bars({ rows, format = (n: number) => String(n), empty = "No data yet." }: { rows: { label: string; value: number; hint?: string }[]; format?: (n: number) => string; empty?: string }) {
  if (!rows.length || rows.every((r) => r.value === 0)) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}${r.hint ? ` — ${r.hint}` : ""}`}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate text-slate-700">{r.label}</span>
            <span className="tabular-nums font-medium text-slate-900">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-gold transition-colors group-hover:bg-amber-brand" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
          </div>
          {r.hint && <div className="mt-0.5 text-[11px] text-slate-500">{r.hint}</div>}
        </li>
      ))}
    </ul>
  );
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function InsightsPage() {
  const ctx = await getContext();
  const [{ data: dealsRaw }, { data: callsRaw }, { data: seqs }, { data: events }, { data: members }] = await Promise.all([
    ctx.supabase.from("deals").select("*"),
    ctx.supabase.from("calls").select("id, status, prep_brief, review, owner_id, kind"),
    ctx.supabase.from("sequences").select("status, checks"),
    ctx.supabase.from("audit_events").select("kind, details, created_at, actor_id").in("kind", ["deal.stage_override", "checklist.override"]).order("created_at", { ascending: false }).limit(200),
    ctx.supabase.from("org_members").select("user_id, full_name, email"),
  ]);

  const deals = ((dealsRaw ?? []) as Deal[]).map((d) => {
    const ev = normalizeEvidence(d.evidence);
    return { ...d, evidence: ev, health: computeDealHealth(d, ev) };
  });
  const open = deals.filter((d) => !["won", "lost", "nurture"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "won");
  const lost = deals.filter((d) => d.stage === "lost");
  const calls = (callsRaw ?? []) as Pick<Call, "id" | "status" | "prep_brief" | "review" | "owner_id" | "kind">[];
  const completed = calls.filter((c) => c.status === "completed");
  const name = (id: string | null) => {
    const m = (members ?? []).find((x) => x.user_id === id);
    return m?.full_name || m?.email || "Unassigned";
  };

  // Pipeline by stage
  const stageRows = DEAL_STAGES.map((s) => ({
    label: s.label,
    value: deals.filter((d) => d.stage === s.key).length,
    hint: fmtMoney(deals.filter((d) => d.stage === s.key).reduce((t, d) => t + (d.amount ?? 0), 0)),
  }));

  // Objections → missing beliefs (root causes, not rebuttals)
  const allObjections = deals.flatMap((d) => d.evidence.objections);
  const beliefCounts = new Map<string, number>();
  for (const o of allObjections) {
    const b = o.missing_belief || OBJECTION_PATTERNS.find((p) => p.key === o.category)?.missingBelief || "";
    if (b) beliefCounts.set(b, (beliefCounts.get(b) ?? 0) + 1);
  }
  const beliefRows = [...beliefCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: BELIEFS[k as BeliefKey]?.label ?? k, value: v, hint: BELIEFS[k as BeliefKey]?.ifMissing }));
  const originCounts = new Map<string, number>();
  for (const o of allObjections) if (o.origin_stage) originCounts.set(o.origin_stage, (originCounts.get(o.origin_stage) ?? 0) + 1);

  // Evidence quality by rep
  const owners = [...new Set(open.map((d) => d.owner_id))];
  const repRows = owners.map((o) => {
    const mine = open.filter((d) => d.owner_id === o);
    return { label: name(o), value: Math.round(mine.reduce((t, d) => t + d.health.completeness, 0) / Math.max(1, mine.length)), hint: `${mine.length} open deal(s)` };
  });

  // Outreach gate
  const seqList = (seqs ?? []) as { status: string; checks: CheckResult[] }[];
  const failCounts = new Map<string, number>();
  for (const s of seqList) for (const c of s.checks ?? []) if (c.status === "fail") failCounts.set(c.label, (failCounts.get(c.label) ?? 0) + 1);
  const approved = seqList.filter((s) => ["approved", "active", "completed"].includes(s.status)).length;
  const rejected = seqList.filter((s) => s.status === "rejected").length;

  // Signals in your data for the funnel diagnostics
  const priceObjections = allObjections.filter((o) => ["price", "budget"].includes(o.category) || /expensive|price|budget/i.test(o.text)).length;
  const lateDeals = deals.filter((d) => ["proposal", "commit", "won", "lost"].includes(d.stage)).length;
  const discoveryNoNext = completed.filter((c) => c.review && !c.review.next_step?.date).length;
  const featureLed = completed.filter((c) => c.review?.coaching?.stage_skipped?.length).length;
  const signals: Record<string, string> = {
    "Discovery conversion": completed.length ? `${pct(discoveryNoNext, completed.filter((c) => c.review).length)}% of reviewed calls ended without a dated next step.` : "",
    Presentation: completed.length ? `${featureLed} reviewed call(s) rushed or skipped a discovery stage.` : "",
    Pricing: lateDeals ? `${priceObjections} price/budget objection(s) across ${lateDeals} late-stage deal(s).` : "",
  };

  // Why deals stall (design §29): causes, not volume. Share of open deals missing each piece of evidence.
  const STALL = [
    { key: "decision_process", lack: "a mapped decision process", label: "No decision process", fix: "Add an approval-path question to the discovery checklist.", ok: (d: (typeof open)[number]) => d.evidence.decision_process.people.length > 0 && !!d.evidence.decision_process.date },
    { key: "gap", lack: "a quantified impact", label: "No quantified impact", fix: "Add an impact question (\"what does this cost per month?\") to the discovery checklist.", ok: (d: (typeof open)[number]) => (d.evidence.value_gap.amount ?? 0) > 0 },
    { key: "multi", lack: "a second stakeholder", label: "Single-threaded", fix: "Add a step to map a second stakeholder before qualification.", ok: (d: (typeof open)[number]) => d.evidence.stakeholders.length >= 2 },
    { key: "roadblock", lack: "a buyer-stated roadblock", label: "No buyer-stated roadblock", fix: "Add \"why hasn't this been solved internally?\" to the call checklist.", ok: (d: (typeof open)[number]) => d.evidence.roadblocks.some((r) => r.source === "buyer-confirmed") },
    { key: "next", lack: "a dated next step", label: "No dated next step", fix: "Make an owned, dated next step a required live-call item.", ok: (d: (typeof open)[number]) => !!d.evidence.next_step.date && !!d.evidence.next_step.owner },
    { key: "urgency", lack: "a quantified cost of delay", label: "Weak timing / priority", fix: "Add a cost-of-inaction question to the priority stage.", ok: (d: (typeof open)[number]) => (d.evidence.cost_of_inaction.amount ?? 0) > 0 },
  ];
  const stall = STALL.map((x) => {
    const affected = open.filter((d) => !x.ok(d));
    return { ...x, count: affected.length, pct: pct(affected.length, open.length) };
  }).sort((a, b) => b.count - a.count);
  const topGap = stall[0]?.count ? stall[0] : null;

  const overrides = (events ?? []) as { kind: string; details: { reason?: string; from?: string; to?: string; item?: string }; created_at: string; actor_id: string }[];

  return (
    <div>
      <PageHeader title="Insights" subtitle="Diagnose the sales system, not just the totals: is it lead volume, response speed, targeting, discovery depth, or proof?" />

      <Signals className="mb-8">
        <Stat label="Open pipeline" value={fmtMoney(open.reduce((t, d) => t + (d.amount ?? 0), 0))} hint={`${open.length} deals`} />
        <Stat label="Win rate" value={won.length + lost.length ? `${pct(won.length, won.length + lost.length)}%` : "—"} hint={`${won.length} won · ${lost.length} lost`} />
        <Stat label="No next step" value={`${pct(open.filter((d) => !d.evidence.next_step.date).length, open.length)}%`} hint="of open deals" />
        <Stat label="Discovery completeness" value={`${Math.round(open.reduce((t, d) => t + d.health.completeness, 0) / Math.max(1, open.length))}%`} hint="avg, open deals" />
        <Stat label="Calls prepared" value={`${pct(calls.filter((c) => c.prep_brief).length, calls.length)}%`} hint={`${calls.length} calls`} />
        <Stat label="Calls reviewed" value={`${pct(completed.filter((c) => c.review).length, completed.length)}%`} hint={`${completed.length} completed`} />
      </Signals>

      {open.length > 0 && (
        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="eyebrow mb-3">Why deals stall · {open.length} open opportunit{open.length === 1 ? "y" : "ies"}</div>
            <ul className="divide-y divide-slate-100 border-y border-slate-200">
              {stall.map((x) => (
                <li key={x.key} className="flex items-center gap-4 py-2.5" title={`${x.count} of ${open.length} open opportunities`}>
                  <span className="num w-12 shrink-0 text-right text-lg font-semibold text-slate-900">{x.pct}%</span>
                  <span className="flex-1 text-sm text-slate-700">{x.label}</span>
                  <span className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 sm:block">
                    <span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.max(x.pct, 2)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {topGap && (
            <NextBestAction
              className="self-start lg:col-span-2"
              context="Top playbook gap"
              what={`${topGap.count} opportunit${topGap.count === 1 ? "y lacks" : "ies lack"} ${topGap.lack}.`}
              why={`Recommended: ${topGap.fix} A playbook change fixes the pattern; chasing deals one by one doesn't.`}
              action={
                <Link href="/playbooks" className="btn btn-primary">
                  Improve playbook <ArrowRight size={14} />
                </Link>
              }
            />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pipeline by stage">
          <Bars rows={stageRows} />
        </Card>
        <Card title="Objections traced to missing beliefs">
          <Bars rows={beliefRows} empty="No objections logged yet. Log them on deals or in live calls." />
          {originCounts.size > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="label">Upstream origin</div>
              {[...originCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="tabular-nums">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>
        <Card title="Evidence quality by seller">
          <Bars rows={repRows} format={(n) => `${n}%`} empty="No open deals." />
          <p className="mt-3 text-xs text-slate-500">Average discovery completeness on open deals. For coaching, not ranking.</p>
        </Card>
        <Card title="Outreach quality gate">
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-slate-50 py-2">
              <div className="text-lg font-semibold tabular-nums">{seqList.length}</div>
              <div className="text-[11px] text-slate-500">drafted</div>
            </div>
            <div className="rounded-md bg-slate-50 py-2">
              <div className="text-lg font-semibold tabular-nums">{approved}</div>
              <div className="text-[11px] text-slate-500">approved</div>
            </div>
            <div className="rounded-md bg-slate-50 py-2">
              <div className="text-lg font-semibold tabular-nums">{rejected}</div>
              <div className="text-[11px] text-slate-500">rejected</div>
            </div>
          </div>
          <div className="label">Most common blocking checks</div>
          <Bars rows={[...failCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} empty="No blocking failures." />
        </Card>
      </div>

      <Card title="Funnel diagnostics" className="mt-6" pad={false}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-36">Phase</th>
                <th className="w-48">Symptom</th>
                <th className="w-48">Common misdiagnosis</th>
                <th className="w-56">Actual root cause</th>
                <th>Remedy</th>
                <th className="w-48">Signal in your data</th>
              </tr>
            </thead>
            <tbody>
              {FUNNEL_DIAGNOSTICS.map((f) => {
                const key = Object.keys(signals).find((k) => f.phase.startsWith(k));
                const signalVal = key && signals[key];
                return (
                  <tr key={f.phase} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <Badge tone="slate">{f.phase}</Badge>
                    </td>
                    <td className="font-medium text-xs text-slate-800">{f.symptom}</td>
                    <td className="text-xs text-slate-400 italic leading-relaxed">{f.misdiagnosis}</td>
                    <td className="text-xs font-medium text-slate-900 leading-relaxed">{f.rootCause}</td>
                    <td className="text-xs text-slate-700 leading-relaxed font-sans">{f.remedy}</td>
                    <td>
                      {signalVal ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2 text-[11px] font-medium text-amber-900 leading-tight">
                          {signalVal}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Loss & nurture reasons">
          {deals.filter((d) => ["lost", "nurture"].includes(d.stage) && d.outcome_reason).length === 0 ? (
            <p className="muted">None recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {deals
                .filter((d) => ["lost", "nurture"].includes(d.stage) && d.outcome_reason)
                .map((d) => (
                  <li key={d.id}>
                    <span className="font-medium">{d.name}</span> <span className="text-xs text-slate-500">({d.stage})</span>
                    <div className="text-slate-600">{d.outcome_reason}</div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
        <Card title="Overrides (coaching queue)">
          {overrides.length === 0 ? (
            <p className="muted">No stage or checklist overrides yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {overrides.slice(0, 15).map((o, i) => (
                <li key={i}>
                  <span className="font-medium">{name(o.actor_id)}</span>{" "}
                  {o.kind === "deal.stage_override" ? `moved a deal ${o.details.from} → ${o.details.to}` : `skipped checklist item ${o.details.item}`}
                  <span className="text-xs text-slate-500"> · {fmtDate(o.created_at)}</span>
                  {o.details.reason && <div className="text-slate-600">“{o.details.reason}”</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
