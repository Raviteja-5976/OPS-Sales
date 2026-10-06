"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Call, Contact } from "@/lib/types";
import { CONVERSATION_STAGES } from "@/lib/playbook";
import { generatePrep, updateCall } from "@/app/actions/calls";
import { ActionButton, ErrorText, useAction } from "@/components/actions";
import { Badge, Card, List } from "@/components/ui";

export function PreparePanel({ call, contacts }: { call: Call; contacts: Contact[] }) {
  const router = useRouter();
  const [objective, setObjective] = useState(call.objective ?? "");
  const [contactId, setContactId] = useState(call.contact_id ?? "");
  const { pending, error, exec } = useAction();
  const p = call.prep_brief;
  const dirty = objective !== (call.objective ?? "") || contactId !== (call.contact_id ?? "");

  return (
    <div className="space-y-6">
      <Card title="Call setup">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Single discovery objective</span>
            <input className="input" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What must you learn on this call?" />
          </label>
          <label className="block">
            <span className="label">Contact</span>
            <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id} disabled={c.opted_out}>
                  {c.name}
                  {c.opted_out ? " (opted out)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="btn" disabled={!dirty || pending} onClick={() => exec(() => updateCall(call.id, { objective, contact_id: contactId || null }))}>
              Save
            </button>
          </div>
        </div>
        <ErrorText error={error} />
      </Card>

      <Card
        title="Preparation brief"
        actions={
          <ActionButton className="btn-sm btn-primary" action={() => generatePrep(call.id)} pendingText="Preparing…">
            {p ? "Regenerate brief" : "Generate brief"}
          </ActionButton>
        }
      >
        {!p ? (
          <p className="muted">
            One page: why this account, role and moment; a permission-based opener; one verified proof point; one honest reason it may not be a fit; and discovery
            questions mapped to what you still don&apos;t know.
          </p>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Context Triad */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1">
                <div className="eyebrow text-slate-700">Why this account</div>
                <p className="text-xs text-slate-700 leading-relaxed">{p.why_account}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1">
                <div className="eyebrow text-slate-700">Why this role</div>
                <p className="text-xs text-slate-700 leading-relaxed">{p.why_role}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1">
                <div className="eyebrow text-slate-700">Why now</div>
                <p className="text-xs text-slate-700 leading-relaxed">{p.why_now}</p>
              </div>
            </div>

            {/* Conversation Opener & Relevance Banner */}
            <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-5 space-y-4">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gold" />
              <div>
                <div className="eyebrow text-gold-deep mb-1">Permission-Based Opener</div>
                <p className="text-[15px] font-semibold text-slate-900 leading-relaxed">“{p.opener}”</p>
              </div>
              <div className="pt-3 border-t border-gold/20">
                <div className="eyebrow text-gold-deep mb-1">Relevance Statement</div>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">“{p.relevance_statement}”</p>
              </div>
            </div>

            {/* Proof vs Honest Non-fit */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5">
                <div className="eyebrow text-emerald-900 flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold">✓</span> Verified Proof Point
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed font-medium">{p.proof_point}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-1.5">
                <div className="eyebrow text-amber-900 flex items-center gap-1.5">
                  <span>◐</span> Honest Reason It May Not Be A Fit
                </div>
                <p className="text-xs text-amber-950 leading-relaxed font-medium">{p.honest_non_fit}</p>
              </div>
            </div>

            {/* Discovery Objective */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="eyebrow mb-1 text-slate-600">Core Discovery Objective</div>
              <p className="font-semibold text-slate-900 text-sm">{p.discovery_objective}</p>
            </div>

            {/* Discovery Questions */}
            <div>
              <div className="eyebrow mb-3 text-slate-700">Discovery Questions Map</div>
              <div className="space-y-2.5">
                {p.questions.map((q, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600 font-mono">
                          {i + 1}
                        </span>
                        <span>{q.question}</span>
                      </span>
                      <Badge tone="slate">{CONVERSATION_STAGES.find((s) => s.n === q.stage)?.name ?? `Stage ${q.stage}`}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 pl-5.5">
                      <span className="font-medium text-slate-600">Fills gap:</span> {q.fills}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow up & exits */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <div className="eyebrow mb-1 text-slate-600">Previous Context</div>
                <List items={p.previous_context} empty="First conversation." />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <div className="eyebrow mb-1 text-slate-600">Respectful Exit</div>
                <p className="text-xs text-slate-700 leading-relaxed">{p.respectful_exit}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <div className="eyebrow mb-1 text-slate-600">Follow-up Option</div>
                <p className="text-xs text-slate-700 leading-relaxed">{p.follow_up_option}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <ActionButton className="btn-primary" action={() => updateCall(call.id, { status: "live" })} onDone={() => router.push(`/calls/${call.id}?mode=live`)}>
          Start call → Live mode
        </ActionButton>
      </div>
    </div>
  );
}
