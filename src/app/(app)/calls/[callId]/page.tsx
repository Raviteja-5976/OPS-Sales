import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { loadAccount, loadChecklist, loadDeal } from "@/lib/loaders";
import { evidenceRail } from "@/lib/readiness";
import type { Call, Contact } from "@/lib/types";
import { Badge, Card, EvidenceRail, PageHeader, Tabs, fmtDate } from "@/components/ui";
import { Checklist } from "@/components/checklist";
import { PreparePanel } from "./prepare";
import { LiveCopilot } from "./live";
import { ReviewPanel } from "./review";

export default async function CallPage({ params, searchParams }: { params: Promise<{ callId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { callId } = await params;
  const { mode: modeParam } = await searchParams;
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("calls").select("*").eq("id", callId).maybeSingle();
  if (!data) notFound();
  const call = data as Call;
  const mode = (modeParam ?? (call.status === "live" ? "live" : call.status === "completed" ? "review" : "prepare")) as "prepare" | "live" | "review";

  const [account, deal, checklist, { data: contacts }, { data: deals }] = await Promise.all([
    loadAccount(ctx, call.account_id),
    call.deal_id ? loadDeal(ctx, call.deal_id) : Promise.resolve(null),
    loadChecklist(ctx, "call", "call", callId),
    ctx.supabase.from("contacts").select("*").eq("account_id", call.account_id).order("name"),
    ctx.supabase.from("deals").select("id, name").eq("account_id", call.account_id).not("stage", "in", "(won,lost)"),
  ]);
  const contact = (contacts as Contact[] | null)?.find((c) => c.id === call.contact_id) ?? null;
  const base = `/calls/${callId}`;

  return (
    <div>
      <PageHeader
        back={{ href: "/calls", label: "Calls" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {call.title} <Badge tone={call.status === "live" ? "green" : call.status === "completed" ? "slate" : "blue"}>{call.status}</Badge>
          </span>
        }
        subtitle={
          <>
            <Link className="link" href={`/accounts/${account.id}`}>
              {account.name}
            </Link>
            {contact && ` · ${contact.name}${contact.title ? `, ${contact.title}` : ""}`}
            {deal && (
              <>
                {" · "}
                <Link className="link" href={`/deals/${deal.id}`}>
                  {deal.name}
                </Link>
              </>
            )}
            {call.scheduled_at && ` · ${fmtDate(call.scheduled_at, true)}`}
          </>
        }
      />
      <Tabs
        active={mode}
        tabs={[
          { key: "prepare", label: "1 · Prepare", href: `${base}?mode=prepare` },
          { key: "live", label: "2 · Live", href: `${base}?mode=live` },
          { key: "review", label: "3 · Review", href: `${base}?mode=review` },
        ]}
      />

      {mode === "live" ? (
        <LiveCopilot call={call} accountName={account.name} rail={deal ? evidenceRail(deal.evidence, deal.currency) : null} checklist={checklist} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {mode === "prepare" ? (
              <PreparePanel call={call} contacts={(contacts ?? []) as Contact[]} />
            ) : (
              <ReviewPanel call={call} deals={deals ?? []} />
            )}
          </div>
          <div className="space-y-6">
            {deal && <EvidenceRail items={evidenceRail(deal.evidence, deal.currency)} title={mode === "review" ? "Evidence before this call" : "What we know going in"} />}
            <Card>
              <Checklist data={checklist} entityType="call" entityId={callId} mode={mode} title={mode === "prepare" ? "Before the call" : "After the call"} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
