import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContext } from "@/lib/context";
import { loadAccount, loadChecklist, loadContacts, loadProducts } from "@/lib/loaders";
import { computeDealHealth } from "@/lib/readiness";
import { normalizeEvidence } from "@/lib/evidence";
import type { Call, Deal, Sequence } from "@/lib/types";
import { ACCOUNT_STATUS_TONE, Badge, Card, NextBestAction, PageHeader, ReadinessBadge, fmtDate, fmtMoney } from "@/components/ui";
import { Checklist } from "@/components/checklist";
import { AccountDetails, AccountTabsLayout } from "./panels";

const SEQ_TONE = { draft: "amber", approved: "blue", active: "green", rejected: "red", stopped: "slate", completed: "slate" } as const;

export default async function AccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const ctx = await getContext();
  const [account, contacts, products, checklist, { data: seqs }, { data: deals }, { data: calls }] = await Promise.all([
    loadAccount(ctx, accountId),
    loadContacts(ctx, accountId),
    loadProducts(ctx),
    loadChecklist(ctx, "account_outreach", "account", accountId),
    ctx.supabase.from("sequences").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    ctx.supabase.from("deals").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    ctx.supabase.from("calls").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
  ]);
  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "—";
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        back={{ href: "/accounts", label: "Accounts" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {account.name}
            <Badge tone={ACCOUNT_STATUS_TONE[account.status]}>{account.status}</Badge>
            <Badge tone={account.tier === 1 ? "blue" : "slate"}>Tier {account.tier}</Badge>
          </span>
        }
        subtitle={[account.industry, account.employee_count && `${account.employee_count} employees`, account.geography, account.domain].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link className="btn" href={`/calls/new?account=${accountId}`}>
              Plan a call
            </Link>
            <Link className="btn" href={`/deals/new?account=${accountId}`}>
              New deal
            </Link>
            <Link className="btn" href={`/outreach/new?account=${accountId}`}>
              Compose outreach
            </Link>
          </>
        }
      />
      {account.status === "disqualified" && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Disqualified: {account.disqualify_reason}. Outreach to this account is blocked.
        </div>
      )}
      {account.status !== "disqualified" &&
        (() => {
          const openDeal = ((deals ?? []) as Deal[]).find((d) => !["won", "lost", "nurture"].includes(d.stage));
          const econ = contacts.find((c) => c.buying_role === "economic_buyer") ?? contacts[0];
          const nba = !account.fit_reason
            ? { what: "Record why this account fits the ICP — and why now.", why: "Fit comes before any message. Without it, outreach is a guess.", href: "#details", cta: "Add fit reason" }
            : !contacts.length
              ? { what: "Map the buying committee.", why: "No contacts yet. Identify the economic buyer, a likely champion and evaluators.", href: "#contacts", cta: "Add contact" }
              : !account.research_brief
                ? { what: "Build a research brief before reaching out.", why: "A brief turns fit and signals into a specific, relevant angle and flags disqualification risk.", href: "#brief", cta: "Research account" }
                : !(account.signals ?? []).length
                  ? { what: "Capture a dated public signal.", why: "A cited signal gives the buyer a real reason to respond. Otherwise use a clearly labelled role hypothesis.", href: "#signals", cta: "Add signal" }
                  : openDeal
                    ? { what: `Continue ${openDeal.name}.`, why: "There's an open opportunity — its evidence record shows what's still missing.", href: `/deals/${openDeal.id}`, cta: "Open opportunity" }
                    : !(seqs ?? []).length
                      ? {
                          what: `Reach out to ${econ?.name ?? "the buyer"}${econ?.title ? ` (${econ.title})` : ""}${account.research_brief.outreach_angle ? ` with the ${account.research_brief.outreach_angle.charAt(0).toLowerCase()}${account.research_brief.outreach_angle.slice(1).replace(/\.$/, "")} angle` : ""}.`,
                          why: "Fit, research and signals are in place. The next step is a permission-based first touch.",
                          href: `/outreach/new?account=${accountId}${econ ? `&contact=${econ.id}` : ""}`,
                          cta: "Compose outreach",
                        }
                      : { what: "Prepare a discovery call.", why: "Outreach is in motion. Prepare the opener and the questions that fill the biggest unknowns.", href: `/calls/new?account=${accountId}`, cta: "Prepare call" };
          return (
            <NextBestAction
              className="mb-6"
              what={nba.what}
              why={nba.why}
              action={
                <Link href={nba.href} className="btn btn-primary">
                  {nba.cta} <ArrowRight size={14} />
                </Link>
              }
            />
          );
        })()}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AccountTabsLayout
            accountId={accountId}
            brief={account.research_brief}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
            signals={account.signals ?? []}
            contacts={contacts}
            outreachSlot={
              <Card title="Outreach" actions={<Link href={`/outreach/new?account=${accountId}`} className="btn btn-sm">New sequence</Link>} pad={false}>
                {(seqs ?? []).length === 0 ? (
                  <p className="muted card-pad">No sequences yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(seqs as Sequence[]).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <Link href={`/outreach/${s.id}`} className="link font-medium">
                            {s.objective} sequence → {contactName(s.contact_id)}
                          </Link>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {productName(s.product_id)} · {s.content?.steps?.length ?? 0} steps · {fmtDate(s.created_at)}
                          </div>
                        </div>
                        <Badge tone={SEQ_TONE[s.status]}>{s.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            }
            dealsSlot={
              <Card title="Deals" pad={false}>
                {(deals ?? []).length === 0 ? (
                  <p className="muted card-pad">No deals yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(deals as Deal[]).map((d) => {
                      const h = computeDealHealth(d, normalizeEvidence(d.evidence));
                      return (
                        <li key={d.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                          <Link href={`/deals/${d.id}`} className="link font-medium">
                            {d.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <Badge>{d.stage}</Badge>
                            <span className="font-medium text-slate-700">{fmtMoney(d.amount, d.currency)}</span>
                            {!["won", "lost", "nurture"].includes(d.stage) && <ReadinessBadge status={h.status} />}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            }
            callsSlot={
              <Card title="Calls" pad={false}>
                {(calls ?? []).length === 0 ? (
                  <p className="muted card-pad">No calls yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(calls as Call[]).map((c) => (
                      <li key={c.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                        <Link href={`/calls/${c.id}`} className="link font-medium">
                          {c.title}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">
                          {c.status} · {fmtDate(c.scheduled_at ?? c.created_at, true)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            }
          />
        </div>
        <div className="space-y-6">
          <div id="details" className="scroll-mt-6"><AccountDetails account={account} /></div>
          <Card>
            <Checklist data={checklist} entityType="account" entityId={accountId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
