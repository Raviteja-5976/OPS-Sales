import Link from "next/link";
import clsx from "clsx";
import { getContext } from "@/lib/context";
import type { Account } from "@/lib/types";
import { ACCOUNT_STATUS_TONE as STATUS_TONE, Badge, Empty, PageHeader } from "@/components/ui";
import { AccountCreate } from "./account-create";

const STATUSES = ["all", "target", "engaged", "customer", "nurture", "disqualified"] as const;

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; new?: string }> }) {
  const { status = "all", q = "", new: openNew } = await searchParams;
  const ctx = await getContext();
  let query = ctx.supabase.from("accounts").select("*").order("tier").order("name");
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data }, { data: contacts }, { data: deals }, { data: seqs }] = await Promise.all([
    query,
    ctx.supabase.from("contacts").select("account_id"),
    ctx.supabase.from("deals").select("account_id, stage"),
    ctx.supabase.from("sequences").select("account_id, status"),
  ]);
  const accounts = (data ?? []) as Account[];
  const count = <T extends { account_id: string }>(rows: T[] | null, id: string, f: (r: T) => boolean = () => true) =>
    (rows ?? []).filter((r) => r.account_id === id && f(r)).length;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Target accounts, contacts, research and outreach. Fit and why-now come before any message."
        actions={<AccountCreate initialOpen={openNew === "1"} />}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200/80 bg-white p-1 shadow-xs">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/accounts?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                s === status ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {s}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input className="input w-64 text-xs" name="q" defaultValue={q} placeholder="Search accounts by name…" />
        </form>
      </div>
      {accounts.length === 0 ? (
        <Empty
          title={status === "all" && !q ? "No target accounts" : "No accounts match"}
          why="Accounts are where fit, public signals and stakeholders come together into a reason to reach out."
        >
          {status === "all" && !q
            ? "OpenRiverStack needs a few accounts to start building your revenue motion. Add your first account manually, or import a CSV with columns like name, domain, industry, tier, contact_name and contact_email."
            : "Try another status or search term."}
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Why it fits</th>
                <th className="text-right">Contacts</th>
                <th className="text-right">Open deals</th>
                <th className="text-right">Sequences</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td>
                    <Link href={`/accounts/${a.id}`} className="font-semibold text-slate-900 hover:text-amber-600 hover:underline">
                      {a.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{[a.industry, a.domain].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td>
                    <Badge tone={a.tier === 1 ? "blue" : "slate"}>Tier {a.tier}</Badge>
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </td>
                  <td className="max-w-xs text-xs text-slate-600 leading-relaxed">
                    {a.fit_reason ? <span className="line-clamp-2">{a.fit_reason}</span> : <span className="text-amber-600 font-medium">Not recorded</span>}
                  </td>
                  <td className="text-right tabular-nums font-semibold text-slate-700">{count(contacts, a.id)}</td>
                  <td className="text-right tabular-nums font-semibold text-slate-700">{count(deals, a.id, (d) => !["won", "lost", "nurture"].includes(d.stage))}</td>
                  <td className="text-right tabular-nums font-semibold text-slate-700">{count(seqs, a.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
