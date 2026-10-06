import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { getContext } from "@/lib/context";
import { normalizeEvidence } from "@/lib/evidence";
import { STAGE_LABEL, computeDealHealth } from "@/lib/readiness";
import type { Call, Deal, Task } from "@/lib/types";
import { Card, NextBestAction, ReadinessBadge, Section, Signals, Stat, fmtDate } from "@/components/ui";
import { TodayTask } from "./task";

type Action = { title: string; context?: string; why: string; href: string; cta: string; weight: number };

export default async function TodayPage() {
  const ctx = await getContext();
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 864e5).toISOString();

  const [{ data: products }, { data: foundations }, { count: accountCount }, { data: dealsRaw }, { data: callsRaw }, { data: drafts }, { data: tasksRaw }] =
    await Promise.all([
      ctx.supabase.from("products").select("id, name, status").neq("status", "archived"),
      ctx.supabase.from("foundations").select("product_id, status").eq("status", "approved"),
      ctx.supabase.from("accounts").select("id", { count: "exact", head: true }),
      ctx.supabase.from("deals").select("*, accounts(name)").not("stage", "in", "(won,lost,nurture)"),
      ctx.supabase.from("calls").select("*, accounts(name)").in("status", ["planned", "live", "completed"]).order("scheduled_at", { ascending: true, nullsFirst: false }).limit(100),
      ctx.supabase.from("sequences").select("id, created_at, accounts(name), contacts(name)").eq("status", "draft").order("created_at"),
      ctx.supabase.from("tasks").select("*").eq("done", false).order("due_date", { ascending: true, nullsFirst: false }).limit(50),
    ]);

  const deals = ((dealsRaw ?? []) as (Deal & { accounts: { name: string } })[]).map((d) => {
    const ev = normalizeEvidence(d.evidence);
    return { ...d, evidence: ev, health: computeDealHealth(d, ev) };
  });
  const calls = (callsRaw ?? []) as (Call & { accounts: { name: string } })[];
  const tasks = (tasksRaw ?? []) as Task[];

  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today);
  const overdueNext = deals.filter((d) => d.evidence.next_step.date && d.evidence.next_step.date < today);
  const noNext = deals.filter((d) => !d.evidence.next_step.date || !d.evidence.next_step.owner);
  const needAction = deals.filter((d) => d.health.status !== "ready");
  const stalled = deals.filter((d) => Date.now() - new Date(d.updated_at).getTime() > 14 * 864e5);
  const upcoming = calls.filter((c) => (c.status === "planned" || c.status === "live") && (!c.scheduled_at || c.scheduled_at <= weekAhead));
  const unprepared = upcoming.filter((c) => !c.prep_brief);
  const unreviewed = calls.filter((c) => c.status === "completed" && !c.review);
  const approvedProducts = new Set((foundations ?? []).map((f) => f.product_id));
  const unapproved = (products ?? []).filter((p) => !approvedProducts.has(p.id));

  // Rule-based next best actions, ranked. Every one carries its rationale.
  const actions: Action[] = [];
  if (!(products ?? []).length)
    actions.push({ title: "Add your first product", why: "Everything starts from a clear offer and its Sales Foundation.", href: "/products/new", cta: "Start intake", weight: 100 });
  for (const d of overdueNext.slice(0, 3))
    actions.push({
      title: `Re-confirm the next step with ${d.accounts?.name}`,
      context: `${d.name} · ${STAGE_LABEL[d.stage]}`,
      why: `"${d.evidence.next_step.purpose}" was due ${fmtDate(d.evidence.next_step.date)}. Momentum dies quietly.`,
      href: `/deals/${d.id}`,
      cta: "Open opportunity",
      weight: 95,
    });
  for (const c of unprepared.filter((c) => c.scheduled_at).slice(0, 3)) {
    const deal = deals.find((d) => d.id === c.deal_id);
    const gap = deal?.health.checks.find((x) => !x.ok);
    actions.push({
      title: `Prepare for ${c.accounts?.name}`,
      context: `${c.kind.replace("_", " ")} · ${fmtDate(c.scheduled_at, true)}`,
      why: gap ? `${gap.label} is still missing — plan the questions that close it.` : "No preparation brief yet. Know why this account, this role, and why now.",
      href: `/calls/${c.id}?mode=prepare`,
      cta: "Prepare call",
      weight: 90,
    });
  }
  for (const c of unreviewed.slice(0, 3))
    actions.push({
      title: `Capture evidence from ${c.title}`,
      context: c.accounts?.name,
      why: "Evidence decays fast. Separate facts from hypotheses and send the recap while it's fresh.",
      href: `/calls/${c.id}?mode=review`,
      cta: "Review call",
      weight: 85,
    });
  for (const p of unapproved.slice(0, 2))
    actions.push({ title: `Approve the Sales Foundation for ${p.name}`, why: "Outreach and proposals should only use approved, sourced claims.", href: `/products/${p.id}`, cta: "Review foundation", weight: 70 });
  for (const d of noNext.filter((d) => !overdueNext.includes(d)).slice(0, 3))
    actions.push({ title: `Set a next step for ${d.accounts?.name}`, context: d.name, why: "Deals without an owned, dated next step stall.", href: `/deals/${d.id}`, cta: "Open opportunity", weight: 75 });
  if ((products ?? []).length && !accountCount)
    actions.push({ title: "Add target accounts", why: "Pick accounts that fit the ICP and have a reason to act now.", href: "/accounts?new=1", cta: "Add account", weight: 65 });
  if ((drafts ?? []).length)
    actions.push({ title: `Review ${drafts!.length} outreach draft${drafts!.length === 1 ? "" : "s"}`, why: "Nothing is sent without your approval.", href: "/outreach", cta: "Review", weight: 60 });
  actions.sort((a, b) => b.weight - a.weight);
  const [top, ...rest] = actions;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-6">
        <div className="eyebrow">
          {greeting}, {ctx.displayName.split(" ")[0]}
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">Here&apos;s what moves revenue today.</h1>
      </div>

      {top ? (
        <NextBestAction
          className="mb-6"
          context={top.context}
          what={top.title}
          why={top.why}
          action={
            <Link href={top.href} className="btn btn-primary">
              {top.cta} <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <NextBestAction
          className="mb-6"
          what="You're clear for now."
          why="Use the time to research a tier-1 account or review a past call for coaching."
          action={
            <Link href="/accounts" className="btn btn-primary">
              Research accounts <ArrowRight size={14} />
            </Link>
          }
        />
      )}

      <Signals className="mb-8">
        <Stat label="Active opportunities" value={deals.length} />
        <Stat label="Need action" value={needAction.length} tone={needAction.length ? "amber" : undefined} />
        <Stat label="Overdue commitments" value={overdueTasks.length + overdueNext.length} tone={overdueTasks.length + overdueNext.length ? "red" : undefined} />
        <Stat label="Stalled 14+ days" value={stalled.length} tone={stalled.length ? "amber" : undefined} />
        <Stat label="Calls this week" value={upcoming.length} hint={unprepared.length ? `${unprepared.length} unprepared` : "all prepared"} />
      </Signals>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {rest.length > 0 && (
            <Card title="Priority Actions Queue">
              <ol className="divide-y divide-slate-100">
                {rest.slice(0, 6).map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 gap-3.5">
                      <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {i + 2}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-slate-900">{a.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">{a.why}</div>
                      </div>
                    </div>
                    <Link href={a.href} className="btn btn-sm shrink-0">
                      {a.cta}
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card
            title="Opportunities Needing Attention"
            actions={
              <Link href="/deals" className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900">
                All opportunities →
              </Link>
            }
            pad={false}
          >
            {needAction.length === 0 ? (
              <div className="p-5">
                <p className="muted">Every open opportunity is ready to advance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Opportunity</th>
                      <th>Blocking Gap</th>
                      <th className="text-right">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needAction
                      .sort((a, b) => (a.health.status === "missing" ? 0 : 1) - (b.health.status === "missing" ? 0 : 1))
                      .slice(0, 8)
                      .map((d) => {
                        const gap = d.health.checks.find((c) => c.critical && !c.ok) ?? d.health.checks.find((c) => !c.ok);
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/70">
                            <td>
                              <Link href={`/deals/${d.id}`} className="font-semibold text-slate-900 hover:underline">
                                {d.accounts?.name}
                              </Link>
                              <div className="text-xs text-slate-500">{d.name}</div>
                            </td>
                            <td className="text-slate-600 font-medium">{gap ? gap.label : "—"}</td>
                            <td className="text-right">
                              <ReadinessBadge status={d.health.status} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Upcoming Calls"
            actions={
              <Link href="/calls/new" className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900">
                Plan a call →
              </Link>
            }
            pad={false}
          >
            {upcoming.length === 0 ? (
              <div className="p-5">
                <p className="muted">No calls scheduled in the next 7 days.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors">
                    <div className="min-w-0">
                      <Link href={`/calls/${c.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                        {c.accounts?.name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="capitalize font-medium text-slate-700">{c.kind.replace("_", " ")}</span> · {c.scheduled_at ? fmtDate(c.scheduled_at, true) : "unscheduled"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx("text-xs font-medium", c.prep_brief ? "text-emerald-700" : "text-amber-700")}>
                        {c.prep_brief ? "● Prepared" : "○ Needs prep"}
                      </span>
                      <Link href={`/calls/${c.id}?mode=${c.prep_brief ? "live" : "prepare"}`} className={clsx("btn btn-sm", !c.prep_brief && "btn-primary")}>
                        {c.prep_brief ? "Go live" : "Prepare"}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Commitments">
            {tasks.length === 0 ? (
              <p className="muted">No open commitments.</p>
            ) : (
              <ul className="space-y-2.5">
                {tasks.slice(0, 15).map((t) => (
                  <TodayTask key={t.id} task={t} overdue={!!t.due_date && t.due_date < today} />
                ))}
              </ul>
            )}
          </Card>
          <Card title="Awaiting your approval" pad={false}>
            {(drafts ?? []).length === 0 ? (
              <p className="muted card-pad">No drafts waiting.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(drafts as unknown as { id: string; accounts: { name: string } | null; contacts: { name: string } | null; created_at: string }[]).slice(0, 6).map((s) => (
                  <li key={s.id} className="px-4 py-2.5">
                    <Link href={`/outreach/${s.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                      {s.contacts?.name ?? "Contact"} · {s.accounts?.name}
                    </Link>
                    <div className="text-xs text-slate-500">Drafted {fmtDate(s.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
