import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getContext } from "@/lib/context";
import { loadAccount, loadChecklist, loadDeal, loadProduct } from "@/lib/loaders";
import { STAGE_LABEL, componentHealth, computeDealHealth, evidenceRail, nextActionFor } from "@/lib/readiness";
import { BELIEFS, BELIEF_KEYS, type Call, type Task } from "@/lib/types";
import { Card, EvidenceRail, HealthBars, NextBestAction, ReadinessBadge, fmtDate, fmtMoney } from "@/components/ui";
import { Checklist } from "@/components/checklist";
import { EvidenceEditor } from "@/components/evidence-editor";
import { DealAI, DealFields, DealWorkspaceTabs, ProposalPanel, StageControl, TasksPanel } from "./panels";

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const ctx = await getContext();
  const deal = await loadDeal(ctx, dealId);
  const [account, product, discovery, close, { data: calls }, { data: tasks }] = await Promise.all([
    loadAccount(ctx, deal.account_id),
    loadProduct(ctx, deal.product_id),
    loadChecklist(ctx, "discovery_to_proposal", "deal", dealId),
    loadChecklist(ctx, "close", "deal", dealId),
    ctx.supabase.from("calls").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    ctx.supabase.from("tasks").select("*").eq("deal_id", dealId).order("done").order("due_date", { ascending: true, nullsFirst: false }),
  ]);
  const e = deal.evidence;
  const health = computeDealHealth(deal, e);
  const rail = evidenceRail(e, deal.currency);
  const components = componentHealth(e);
  const open = !["won", "lost", "nurture"].includes(deal.stage);

  // Prefer a fresh AI diagnosis; otherwise the deterministic rule. Both carry a "why".
  const ai = deal.ai_diagnosis;
  const aiFresh = ai?.generated_at && new Date(ai.generated_at) >= new Date(deal.updated_at);
  const rule = nextActionFor(health, deal.stage);
  const nba = aiFresh && ai ? { what: ai.next_best_action.action, why: ai.next_best_action.why, kind: "ask" as const, cta: "Prepare question" } : rule;
  const ctaHref = nba.kind === "ask" ? `/calls/new?deal=${dealId}` : nba.kind === "close" ? "#checklists" : "#evidence";

  return (
    <div>
      <Link href="/deals" className="mb-3 inline-flex text-xs font-medium text-slate-500 hover:text-slate-900">
        ← Opportunities
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">
            <Link href={`/accounts/${account.id}`} className="hover:text-slate-900">
              {account.name}
            </Link>{" "}
            ·{" "}
            <Link href={`/products/${product.id}`} className="hover:text-slate-900">
              {product.name}
            </Link>
          </div>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{deal.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {open && <ReadinessBadge status={health.status} />}
            <span>Close {fmtDate(deal.close_date)}</span>
            {open && e.next_step.date && <span>Next step {fmtDate(e.next_step.date)}</span>}
          </div>
        </div>
        <div className="w-full max-w-xs text-right">
          <div className="num text-[30px] font-semibold leading-none text-slate-900">{fmtMoney(deal.amount, deal.currency)}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${Math.max(health.completeness, 3)}%` }} />
            </div>
            <span className="num text-xs font-medium text-slate-600">{health.completeness}% evidence</span>
          </div>
        </div>
      </div>

      <StageControl dealId={dealId} stage={deal.stage} health={health} outcomeReason={deal.outcome_reason} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DealWorkspaceTabs
            hasDiagnosis={!!deal.ai_diagnosis}
            hasProposal={!!deal.proposal}
            evidenceSlot={
              <div className="space-y-6">
                <NextBestAction
                  context={aiFresh ? "From deal diagnosis" : `${STAGE_LABEL[deal.stage]} stage`}
                  what={nba.what}
                  why={nba.why}
                  action={
                    nba.kind !== "advance" && (
                      <Link href={ctaHref} className="btn btn-primary">
                        {nba.cta} <ArrowRight size={14} />
                      </Link>
                    )
                  }
                  secondary={
                    <a href="#diagnosis" className="btn btn-ghost">
                      Explain why
                    </a>
                  }
                />

                {open && (
                  <section className="card">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-2.5">
                      <h2 className="h-section">
                        To leave {STAGE_LABEL[deal.stage]}
                        {health.nextStage && <> → {STAGE_LABEL[health.nextStage]}</>}
                      </h2>
                      <span className="num text-xs text-slate-500">
                        {health.checks.filter((c) => c.ok).length}/{health.checks.length} met
                      </span>
                    </div>
                    <ul className="grid gap-x-6 px-5 py-3 sm:grid-cols-2">
                      {health.checks.map((c) => (
                        <li key={c.key} className="flex gap-2.5 py-1.5 text-sm">
                          <span className={clsx("w-3 shrink-0 text-center font-semibold", c.ok ? "text-emerald-700" : c.critical ? "text-red-600" : "text-amber-600")}>
                            {c.ok ? "✓" : c.critical ? "○" : "◐"}
                          </span>
                          <div className="min-w-0">
                            <div className={c.ok ? "text-slate-500" : "text-slate-900"}>{c.label}</div>
                            {!c.ok && <div className="text-xs text-slate-500">{c.detail}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {health.redFlags.length > 0 && (
                      <div className="border-t border-slate-200 px-5 py-3">
                        <div className="eyebrow mb-1.5 text-red-700">Risks</div>
                        <ul className="space-y-1 text-sm text-red-700">
                          {health.redFlags.map((f) => (
                            <li key={f}>⚠ {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                <div id="evidence" className="scroll-mt-6">
                  <EvidenceEditor key={deal.updated_at} dealId={dealId} evidence={e} amount={deal.amount} currency={deal.currency} />
                </div>
              </div>
            }
            diagnosisSlot={
              <div id="diagnosis" className="scroll-mt-6 space-y-6">
                <DealAI dealId={dealId} diagnosis={deal.ai_diagnosis} presentation={health.presentation} evidence={e} />
              </div>
            }
            proposalSlot={
              <div id="proposal" className="scroll-mt-6 space-y-6">
                <ProposalPanel dealId={dealId} proposal={deal.proposal} presentation={health.presentation} evidence={e} />
              </div>
            }
            executionSlot={
              <div className="space-y-6">
                <TasksPanel dealId={dealId} accountId={deal.account_id} tasks={(tasks ?? []) as Task[]} />

                <Card title="Linked Calls" actions={<Link href={`/calls/new?deal=${dealId}`} className="text-xs font-medium text-slate-500 hover:text-slate-900">Plan call →</Link>} pad={false}>
                  {(calls ?? []).length === 0 ? (
                    <p className="muted card-pad">No calls linked to this deal yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {(calls as Call[]).map((c) => (
                        <li key={c.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                          <Link href={`/calls/${c.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                            {c.title}
                          </Link>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {c.status} · {fmtDate(c.scheduled_at ?? c.created_at, true)}
                            {c.review && " · reviewed"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <div id="checklists" className="scroll-mt-6 space-y-6">
                  <Card title="Discovery to Proposal Gate">
                    <Checklist data={discovery} entityType="deal" entityId={dealId} compact />
                  </Card>
                  <Card title="Close Gate">
                    <Checklist data={close} entityType="deal" entityId={dealId} compact />
                  </Card>
                </div>
              </div>
            }
          />
        </div>

        <div className="space-y-6">
          <DealFields dealId={dealId} name={deal.name} amount={deal.amount} closeDate={deal.close_date} currency={deal.currency} />

          <Card title="Opportunity health">
            <HealthBars components={components} />
            <p className="mt-3 text-[11px] text-slate-500">Each bar measures the evidence behind it, not a win probability. Open a row to see why.</p>
          </Card>

          <Card title="Buying-belief map">
            <p className="-mt-1 mb-3 text-[11px] text-slate-500">Evidence supporting each buying belief.</p>
            <ul className="space-y-2">
              {BELIEF_KEYS.map((k) => {
                const s = e.buying_beliefs[k].score;
                return (
                  <li key={k} className="flex items-center gap-3" title={e.buying_beliefs[k].evidence || BELIEFS[k].question}>
                    <span className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{BELIEFS[k].label}</span>
                    <span className="flex flex-1 gap-[2px]" aria-label={`${s ?? 0} of 10`}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className={clsx(
                            "h-2 flex-1 rounded-[2px]",
                            s !== null && i < s ? (s >= 8 ? "bg-gold" : s >= 5 ? "bg-amber-500" : "bg-red-500") : "bg-slate-100",
                          )}
                        />
                      ))}
                    </span>
                    <span className="num w-6 text-right text-xs text-slate-500">{s ?? "—"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Presentation {health.presentation.unlocked ? <span className="text-emerald-700">● earned</span> : <span className="text-amber-700">◐ not yet earned</span>}
            </p>
          </Card>

          <EvidenceRail items={rail} />
        </div>
      </div>
    </div>
  );
}
