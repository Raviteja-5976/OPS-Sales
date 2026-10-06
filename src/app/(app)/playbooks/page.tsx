import Link from "next/link";
import { getContext, canManage } from "@/lib/context";
import type { ChecklistTemplate } from "@/lib/types";
import { BELIEFS } from "@/lib/types";
import { CONVERSATION_STAGES, OBJECTION_PATTERNS } from "@/lib/playbook";
import { Badge, Card, PageHeader, Tabs } from "@/components/ui";
import { CloneButton } from "./clone-button";

export default async function PlaybooksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "checklists" } = await searchParams;
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("checklist_templates").select("*").order("created_at");
  const templates = (data ?? []) as ChecklistTemplate[];
  const manage = canManage(ctx.role);

  return (
    <div>
      <PageHeader title="Playbooks" subtitle="Checklists, conversation guide and objection map. Clone a built-in checklist to tailor it to your motion." />
      <Tabs
        active={tab}
        tabs={[
          { key: "checklists", label: "Checklists", href: "/playbooks?tab=checklists" },
          { key: "conversation", label: "Conversation guide", href: "/playbooks?tab=conversation" },
          { key: "objections", label: "Objection map", href: "/playbooks?tab=objections" },
        ]}
      />

      {tab === "checklists" && (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => {
            const active = !t.built_in || !templates.some((o) => o.key === t.key && !o.built_in);
            return (
              <div key={t.id} className="card card-pad flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                    <div className="flex items-center gap-1.5">
                      {t.built_in ? <Badge>built-in</Badge> : <Badge tone="violet">custom</Badge>}
                      {!active && <Badge tone="amber">replaced by custom</Badge>}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{t.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{t.items.length} items</span>
                    <span>·</span>
                    <span>{t.items.filter((i) => i.required).length} required</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-slate-700">{t.scope}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link href={`/playbooks/${t.id}`} className="btn btn-sm">
                    {manage && !t.built_in ? "Edit checklist" : "View items"}
                  </Link>
                  {manage && t.built_in && <CloneButton id={t.id} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "conversation" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Soft guardrails, not a script. Real conversations aren&apos;t linear — revisit any stage when you need to.
          </p>
          {CONVERSATION_STAGES.map((s) => (
            <Card key={s.n} title={`${s.n}. ${s.name}`}>
              <div className="grid gap-4 text-xs md:grid-cols-3">
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                    <div className="eyebrow text-slate-600">Stage Objective</div>
                    <p className="text-slate-800 font-medium leading-relaxed">{s.objective}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                    <div className="eyebrow text-emerald-800">Exit Gate</div>
                    <p className="text-slate-800 font-medium leading-relaxed">{s.exitGate}</p>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <div className="eyebrow mb-1.5 text-slate-600">Conversation Prompts</div>
                    <ul className="space-y-1.5">
                      {s.prompts.map((p) => (
                        <li key={p} className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-slate-800 shadow-xs leading-relaxed">
                          “{p}”
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px]">
                    <span className="text-slate-500"><strong className="text-slate-700">Failure mode:</strong> {s.failureMode}</span>
                    {s.guardrail && <span className="text-amber-800 font-medium">⚑ Guardrail: {s.guardrail}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "objections" && (
        <div className="space-y-6">
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Buyer says</th>
                  <th>Likely origin</th>
                  <th>Missing belief</th>
                  <th>Validate</th>
                  <th>Isolate</th>
                  <th>Then</th>
                </tr>
              </thead>
              <tbody>
                {OBJECTION_PATTERNS.map((o) => (
                  <tr key={o.key} className="hover:bg-slate-50 transition-colors">
                    <td className="font-semibold text-slate-900 text-xs">“{o.statement}”</td>
                    <td className="text-xs">
                      <div className="font-medium text-slate-800">{o.primaryOrigin}</div>
                      <div className="text-[11px] text-slate-400">or {o.secondaryOrigin}</div>
                    </td>
                    <td>
                      <Badge tone="amber">{BELIEFS[o.missingBelief].label}</Badge>
                    </td>
                    <td className="text-xs text-slate-600 leading-relaxed">{o.cushion}</td>
                    <td className="text-xs text-slate-600 leading-relaxed">{o.isolate}</td>
                    <td className="text-xs text-slate-600 leading-relaxed">{o.response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card title="The Seven Buying Beliefs">
            <div className="grid gap-3.5 md:grid-cols-2">
              {Object.entries(BELIEFS).map(([k, b], i) => (
                <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">
                      {i + 1}. {b.label}
                    </span>
                    <Badge tone="blue">Belief {i + 1}</Badge>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">{b.conviction}</p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-amber-950 font-medium">
                    ⚡ <strong>Ask:</strong> “{b.question}”
                  </div>
                  <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-2 text-rose-800 text-[11px]">
                    <strong>If missing:</strong> {b.ifMissing}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
