import { getContext, canManage } from "@/lib/context";
import { loadMembers } from "@/lib/loaders";
import { Card, PageHeader, fmtDate } from "@/components/ui";
import { InvitesPanel, MembersPanel, OrgSettingsForm, SuppressionPanel } from "./panels";

export default async function SettingsPage() {
  const ctx = await getContext();
  const manage = canManage(ctx.role);
  const [members, { data: invites }, { data: suppressions }, { data: audit }] = await Promise.all([
    loadMembers(ctx),
    manage ? ctx.supabase.from("org_invites").select("*").is("accepted_at", null).order("created_at") : Promise.resolve({ data: [] }),
    ctx.supabase.from("suppressions").select("*").order("created_at", { ascending: false }),
    ctx.supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle={`${ctx.org.name} · you are ${ctx.role}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <OrgSettingsForm org={ctx.org} editable={manage} />
        <div className="space-y-6">
          <MembersPanel members={members} me={ctx.user.id} isOwner={ctx.role === "owner"} />
          {manage && <InvitesPanel invites={(invites ?? []) as { id: string; email: string; role: string; created_at: string }[]} />}
        </div>
        <SuppressionPanel items={(suppressions ?? []) as { id: string; value: string; reason: string | null; created_at: string }[]} canRemove={manage} />
        <Card title="Audit log" pad={false}>
          <p className="px-5 pt-3 text-xs text-slate-500">Immutable record of AI actions, approvals, overrides, opt-outs and settings changes.</p>
          <div className="max-h-96 overflow-y-auto">
            <table className="table">
              <tbody>
                {(audit ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(a.created_at, true)}</td>
                    <td className="font-mono text-xs">{a.kind}</td>
                    <td className="text-xs text-slate-500">
                      {members.find((m) => m.user_id === a.actor_id)?.full_name || members.find((m) => m.user_id === a.actor_id)?.email || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
