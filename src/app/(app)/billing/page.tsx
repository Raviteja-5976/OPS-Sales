import { getContext, canManage } from "@/lib/context";
import { loadEntitlement, planUsage } from "@/lib/billing";
import { Badge, Card, PageHeader, Progress, Stat, fmtDate } from "@/components/ui";
import { fmtInr } from "@/lib/billing/plans";
import { CancelPlanButton, PackPicker, PlanPicker } from "./panels";

const FEATURE_LABELS: Record<string, string> = {
  foundation_interview: "Foundation interview",
  foundation_part: "Foundation sections",
  sales_plan: "30/60/90 plan",
  account_brief: "Account briefs",
  outreach_sequence: "Outreach sequences",
  outreach_review: "Outreach reviews",
  call_prep: "Call prep",
  live_next_question: "Live next question",
  objection_diagnosis: "Objection diagnosis",
  call_review: "Call reviews",
  deal_diagnosis: "Deal diagnosis",
  proposal_draft: "Proposals",
};

export default async function BillingPage() {
  const ctx = await getContext();
  const manage = canManage(ctx.role);
  const ent = await loadEntitlement(ctx.org.id);
  const [used, { data: usageRows }, { data: purchases }, { count: productCount }] = await Promise.all([
    planUsage(ctx.org.id, ent.periodStart),
    ctx.supabase.from("ai_usage").select("feature, source").neq("status", "refunded").gte("created_at", ent.periodStart.toISOString()),
    ctx.supabase.from("credit_purchases").select("*").eq("status", "paid").order("paid_at", { ascending: false }).limit(10),
    ctx.supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const byFeature = new Map<string, number>();
  for (const r of usageRows ?? []) byFeature.set(r.feature, (byFeature.get(r.feature) ?? 0) + 1);
  const pct = ent.allowance ? (used / ent.allowance) * 100 : 100;
  const paid = ent.plan.id !== "free";

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Your plan, AI usage and top-up packs. Prices exclude 18% GST, which is added at checkout. Payments are processed by Razorpay."
      />

      <div className="mb-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plan" value={ent.plan.name} hint={paid ? `${fmtInr(ent.plan.pricePaise * ent.seats)}/month + GST` : "No subscription"} />
        <Stat
          label="AI actions this period"
          value={`${used} / ${ent.allowance}`}
          tone={pct >= 100 ? "red" : pct >= 80 ? "amber" : undefined}
          hint={`Resets ${fmtDate(ent.periodEnd.toISOString())}`}
        />
        <Stat label="Top-up actions" value={ent.credits} hint="Used after the monthly allowance · never expire" />
        <Stat
          label="Products"
          value={`${productCount ?? 0} / ${ent.plan.maxProducts ?? "∞"}`}
          tone={ent.plan.maxProducts !== null && (productCount ?? 0) >= ent.plan.maxProducts ? "amber" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Current plan"
          className="lg:col-span-1"
          actions={
            paid && ent.status === "past_due" ? (
              <Badge tone="red">Payment failed</Badge>
            ) : ent.cancelAtPeriodEnd ? (
              <Badge tone="amber">Cancels {fmtDate(ent.periodEnd.toISOString())}</Badge>
            ) : (
              <Badge tone="green">Active</Badge>
            )
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-slate-900">
                {ent.plan.name}
                {ent.plan.perSeat && ` · ${ent.seats} seat${ent.seats === 1 ? "" : "s"}`}
              </div>
              <div className="muted">
                {paid ? `Period ${fmtDate(ent.periodStart.toISOString())} – ${fmtDate(ent.periodEnd.toISOString())}` : "Free plan, resets monthly"}
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Monthly AI actions</span>
                <span>{Math.max(0, ent.allowance - used)} left</span>
              </div>
              <Progress value={pct} tone={pct >= 100 ? "red" : pct >= 80 ? "amber" : "brand"} />
            </div>
            {paid && ent.status === "past_due" && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                Your last renewal payment failed. Razorpay is retrying; update your payment method from the Razorpay email to keep your plan.
              </p>
            )}
            {manage && paid && !ent.cancelAtPeriodEnd && <CancelPlanButton periodEnd={fmtDate(ent.periodEnd.toISOString())} />}
          </div>
        </Card>

        <Card title="Usage this period" className="lg:col-span-2" pad={false}>
          {byFeature.size ? (
            <table className="table">
              <tbody>
                {[...byFeature.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([f, n]) => (
                    <tr key={f}>
                      <td>{FEATURE_LABELS[f] ?? f}</td>
                      <td className="num text-right">{n}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="muted px-5 py-4">No AI actions yet this period.</p>
          )}
        </Card>
      </div>

      <h2 className="h-section mb-3 mt-8">Plans</h2>
      <PlanPicker currentPlan={ent.plan.id} currentSeats={ent.seats} cancelling={ent.cancelAtPeriodEnd} canManage={manage} />

      <h2 className="h-section mb-1 mt-8">Buy more AI actions</h2>
      <p className="muted mb-3 text-sm">
        One-time packs. They&apos;re used only after your monthly allowance runs out, and they never expire.
      </p>
      <PackPicker canManage={manage} />

      {!!purchases?.length && (
        <Card title="Top-up history" className="mt-8" pad={false}>
          <table className="table">
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(p.paid_at, true)}</td>
                  <td>{p.credits} AI actions</td>
                  <td className="num text-right">{fmtInr(p.amount_paise)} incl. GST</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!manage && <p className="muted mt-6 text-sm">Only owners and managers can change the plan or buy top-ups.</p>}
    </div>
  );
}
