import Link from "next/link";
import { getContext } from "@/lib/context";
import type { Call } from "@/lib/types";
import { Badge, Empty, PageHeader, fmtDate } from "@/components/ui";

const TONE = { planned: "blue", live: "green", completed: "slate", cancelled: "red" } as const;

export default async function CallsPage() {
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("calls")
    .select("*, accounts(name), contacts(name), deals(name)")
    .order("scheduled_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(200);
  const calls = (data ?? []) as (Call & { accounts: { name: string }; contacts: { name: string } | null; deals: { name: string } | null })[];
  const upcoming = calls.filter((c) => c.status === "planned" || c.status === "live");
  const done = calls.filter((c) => c.status === "completed");

  const Row = ({ c }: { c: (typeof calls)[number] }) => (
    <tr className="hover:bg-slate-50">
      <td>
        <Link href={`/calls/${c.id}${c.status === "completed" ? "?mode=review" : ""}`} className="link">
          {c.title}
        </Link>
        <div className="text-xs text-slate-500">
          {c.accounts?.name}
          {c.contacts && ` · ${c.contacts.name}`}
          {c.deals && ` · ${c.deals.name}`}
        </div>
      </td>
      <td className="capitalize">{c.kind.replace("_", " ")}</td>
      <td>{fmtDate(c.scheduled_at, true)}</td>
      <td>
        <div className="flex flex-wrap gap-1">
          <Badge tone={TONE[c.status]}>{c.status}</Badge>
          {c.status === "planned" && (c.prep_brief ? <Badge tone="green">prepared</Badge> : <Badge tone="amber">needs prep</Badge>)}
          {c.status === "completed" && (c.review ? <Badge tone="green">reviewed</Badge> : <Badge tone="amber">needs review</Badge>)}
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <PageHeader
        title="Calls"
        subtitle="Prepare before, stay on track during, and capture evidence after every conversation. Works with or without recording."
        actions={
          <Link href="/calls/new" className="btn btn-primary">
            Plan a call
          </Link>
        }
      />
      {calls.length === 0 ? (
        <Empty title="No calls yet" action={<Link className="btn btn-primary" href="/calls/new">Plan a call</Link>} />
      ) : (
        <div className="space-y-6">
          {[
            { title: "Upcoming & live", rows: upcoming },
            { title: "Completed", rows: done },
          ].map((g) =>
            g.rows.length ? (
              <div key={g.title}>
                <h2 className="mb-2 text-sm font-semibold text-slate-700">{g.title}</h2>
                <div className="card overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Call</th>
                        <th>Type</th>
                        <th>When</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((c) => (
                        <Row key={c.id} c={c} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
