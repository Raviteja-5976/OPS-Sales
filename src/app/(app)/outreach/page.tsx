import Link from "next/link";
import clsx from "clsx";
import { getContext } from "@/lib/context";
import type { CheckResult, Sequence } from "@/lib/types";
import { Badge, Empty, PageHeader, fmtDate } from "@/components/ui";

const TABS = [
  { key: "review", label: "Needs review", statuses: ["draft"] },
  { key: "approved", label: "Approved — ready to send", statuses: ["approved"] },
  { key: "active", label: "Sending", statuses: ["active"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "stopped", "completed"] },
];

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "review" } = await searchParams;
  const ctx = await getContext();
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const [{ data }, { data: counts }] = await Promise.all([
    ctx.supabase
      .from("sequences")
      .select("*, accounts(name), contacts(name, title), products(name)")
      .in("status", current.statuses)
      .order("created_at", { ascending: false }),
    ctx.supabase.from("sequences").select("status"),
  ]);
  const rows = (data ?? []) as (Sequence & { accounts: { name: string } | null; contacts: { name: string; title: string | null } | null; products: { name: string } | null })[];

  return (
    <div>
      <PageHeader
        title="Outreach"
        subtitle="A campaign planner and quality gate. Every sequence is drafted by AI, checked for compliance, and approved by a person before anything is sent."
        actions={
          <Link href="/outreach/new" className="btn btn-primary">
            Compose sequence
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const n = (counts ?? []).filter((c) => t.statuses.includes(c.status)).length;
          return (
            <Link
              key={t.key}
              href={`/outreach?tab=${t.key}`}
              className={clsx("rounded-full px-3 py-1 text-sm", t.key === current.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              {t.label} <span className="opacity-60">{n}</span>
            </Link>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <Empty title="Nothing here">Compose a sequence from an account page or with the button above.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Product</th>
                <th>Objective</th>
                <th>Checks</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const checks = (s.checks ?? []) as CheckResult[];
                const fails = checks.filter((c) => c.status === "fail").length;
                const warns = checks.filter((c) => c.status === "warn").length;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td>
                      <Link className="link" href={`/outreach/${s.id}`}>
                        {s.contacts?.name ?? "No contact"}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {s.contacts?.title} · {s.accounts?.name}
                      </div>
                    </td>
                    <td>{s.products?.name}</td>
                    <td className="capitalize">{s.objective}</td>
                    <td>
                      <div className="flex gap-1">
                        {fails > 0 && <Badge tone="red">{fails} failing</Badge>}
                        {warns > 0 && <Badge tone="amber">{warns} warnings</Badge>}
                        {!fails && !warns && <Badge tone="green">All passing</Badge>}
                      </div>
                    </td>
                    <td className="text-slate-500">{fmtDate(s.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
