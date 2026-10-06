import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getContext } from "@/lib/context";
import { normalizeEvidence } from "@/lib/evidence";
import { STAGE_LABEL, computeDealHealth, evidenceRail, nextActionFor } from "@/lib/readiness";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/types";
import { Empty, NextBestAction, PageHeader, ReadinessBadge, fmtDate, fmtMoney } from "@/components/ui";

const JOURNEY = DEAL_STAGES.filter((s) => s.open);

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ product?: string; stage?: string; closed?: string }> }) {
  const { product, stage, closed } = await searchParams;
  const ctx = await getContext();
  let q = ctx.supabase.from("deals").select("*, accounts(name), products(name)").order("updated_at", { ascending: false });
  if (product) q = q.eq("product_id", product);
  const [{ data }, { data: products }] = await Promise.all([q, ctx.supabase.from("products").select("id, name").neq("status", "archived")]);
  const deals = ((data ?? []) as (Deal & { accounts: { name: string }; products: { name: string } })[]).map((d) => {
    const ev = normalizeEvidence(d.evidence);
    const health = computeDealHealth(d, ev);
    return { ...d, evidence: ev, health, rail: evidenceRail(ev, d.currency), action: nextActionFor(health, d.stage) };
  });

  const selected = (JOURNEY.find((s) => s.key === stage)?.key ?? null) as DealStage | null;
  const openDeals = deals.filter((d) => JOURNEY.some((s) => s.key === d.stage));
  const closedDeals = deals.filter((d) => !JOURNEY.some((s) => s.key === d.stage));
  const shown = closed ? closedDeals : selected ? openDeals.filter((d) => d.stage === selected) : openDeals;
  const qs = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries({ product, ...p }).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return s ? `/deals?${s}` : "/deals";
  };

  // Aggregate evidence for the selected stage: confirmed / inferred / missing.
  const stageInsight = selected
    ? (() => {
        const inStage = openDeals.filter((d) => d.stage === selected);
        const counts = new Map<string, { label: string; confirmed: number; partial: number; missing: number }>();
        for (const d of inStage)
          for (const r of d.rail) {
            const c = counts.get(r.key) ?? { label: r.label, confirmed: 0, partial: 0, missing: 0 };
            c[r.state === "confirmed" ? "confirmed" : r.state === "partial" ? "partial" : "missing"]++;
            counts.set(r.key, c);
          }
        const blockers = new Map<string, number>();
        for (const d of inStage) for (const c of d.health.checks.filter((x) => !x.ok)) blockers.set(c.label, (blockers.get(c.label) ?? 0) + 1);
        const topBlocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0];
        const exemplar = inStage.find((d) => d.health.checks.some((c) => c.label === topBlocker?.[0]));
        return { inStage, counts: [...counts.values()], topBlocker, exemplar };
      })()
    : null;

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Each stage is a level of evidence, not a column of activity. Click a stage to see what's confirmed, inferred and missing."
        actions={
          <Link href="/deals/new" className="btn btn-primary">
            New opportunity
          </Link>
        }
      />

      {/* Evidence journey */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-[640px] items-stretch">
          {JOURNEY.map((s, i) => {
            const inStage = openDeals.filter((d) => d.stage === s.key);
            const value = inStage.reduce((t, d) => t + (d.amount ?? 0), 0);
            const ready = inStage.filter((d) => d.health.status === "ready").length;
            const active = selected === s.key;
            return (
              <Link
                key={s.key}
                href={active ? qs({}) : qs({ stage: s.key })}
                className={clsx(
                  "group relative flex-1 border-y border-r border-slate-200 px-4 py-3 transition-colors duration-150 first:rounded-l-lg first:border-l last:rounded-r-lg",
                  active ? "bg-surface-warm" : "bg-white hover:bg-slate-50",
                )}
              >
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gold" />}
                <div className="flex items-center gap-2">
                  <span className="num font-mono text-[10px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="eyebrow text-slate-700">{s.label}</span>
                  {i < JOURNEY.length - 1 && <ArrowRight size={12} className="ml-auto text-slate-300 transition-transform group-hover:translate-x-0.5" />}
                </div>
                <div className="num mt-1.5 text-[26px] font-semibold leading-none text-slate-900">{inStage.length}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {fmtMoney(value)} · {ready} ready
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        <Link href={selected ? `/deals?stage=${selected}` : "/deals"} className={clsx("rounded-full px-3 py-1", !product ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
          All products
        </Link>
        {(products ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/deals?product=${p.id}${selected ? `&stage=${selected}` : ""}`}
            className={clsx("rounded-full px-3 py-1", product === p.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
          >
            {p.name}
          </Link>
        ))}
        <span className="mx-2 h-4 w-px bg-slate-200" />
        <Link href={closed ? qs({}) : qs({ closed: "1" })} className="text-xs font-medium text-slate-500 hover:text-slate-900">
          {closed ? "← Back to open opportunities" : `Won / lost / nurture (${closedDeals.length})`}
        </Link>
      </div>

      {stageInsight && stageInsight.inStage.length > 0 && (
        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          <div className="card card-pad lg:col-span-3">
            <div className="eyebrow mb-3">{STAGE_LABEL[selected!]} stage · evidence across {stageInsight.inStage.length} opportunit{stageInsight.inStage.length === 1 ? "y" : "ies"}</div>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {stageInsight.counts.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{c.label}</span>
                  <span className="num flex gap-2.5 text-xs">
                    <span className="text-emerald-700" title="Confirmed">✓ {c.confirmed}</span>
                    <span className="text-amber-600" title="Inferred / partial">◐ {c.partial}</span>
                    <span className="text-slate-400" title="Missing">○ {c.missing}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {stageInsight.topBlocker && stageInsight.exemplar && (
            <NextBestAction
              className="lg:col-span-2"
              context={`${stageInsight.topBlocker[1]} of ${stageInsight.inStage.length} blocked here`}
              what={stageInsight.exemplar.action.what}
              why={`Most common gap in this stage: ${stageInsight.topBlocker[0].toLowerCase()}.`}
              action={
                <Link href={`/deals/${stageInsight.exemplar.id}`} className="btn btn-primary btn-sm">
                  Start with {stageInsight.exemplar.accounts?.name} <ArrowRight size={13} />
                </Link>
              }
            />
          )}
        </div>
      )}

      {deals.length === 0 ? (
        <Empty
          title="No opportunities yet"
          why="An opportunity holds the buyer-confirmed evidence record — the facts behind every forecast."
          action={
            <>
              <Link className="btn btn-primary" href="/deals/new">
                Create opportunity
              </Link>
              <Link className="btn" href="/accounts">
                Go to accounts
              </Link>
            </>
          }
        >
          Create one once a conversation is meaningful: you&apos;ve spoken to someone, and there&apos;s a problem worth exploring.
        </Empty>
      ) : shown.length === 0 ? (
        <p className="muted py-8 text-center">Nothing in this view.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Stage</th>
                <th className="text-right">Value</th>
                <th>Evidence</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-slate-50">
                  <td>
                    <Link href={`/deals/${d.id}`} className="font-medium text-slate-900 hover:underline">
                      {d.accounts?.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {d.name} · {d.products?.name}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="text-slate-800">{STAGE_LABEL[d.stage]}</div>
                    {JOURNEY.some((s) => s.key === d.stage) ? <ReadinessBadge status={d.health.status} /> : <div className="max-w-[200px] truncate text-xs text-slate-500">{d.outcome_reason}</div>}
                  </td>
                  <td className="num whitespace-nowrap text-right font-medium">{fmtMoney(d.amount, d.currency)}</td>
                  <td className="w-40">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={clsx("h-full rounded-full", d.health.completeness >= 70 ? "bg-gold" : d.health.completeness >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.max(d.health.completeness, 3)}%` }} />
                      </div>
                      <span className="num w-8 text-right text-xs text-slate-600">{d.health.completeness}%</span>
                    </div>
                  </td>
                  <td className="max-w-xs">
                    <div className="text-slate-800">{d.action.what}</div>
                    <div className="text-xs text-slate-500">
                      {d.evidence.next_step.date ? `Next step ${fmtDate(d.evidence.next_step.date)}` : <span className="text-red-600">No next step</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
