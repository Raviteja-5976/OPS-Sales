"use client";

import { useState } from "react";
import type { Call } from "@/lib/types";
import { applyReview, linkCallToDeal, reviewCall, updateCall } from "@/app/actions/calls";
import { ActionButton, CopyButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Badge, Card, List } from "@/components/ui";
import { DocView, type Json } from "@/components/json-doc";

export function ReviewPanel({ call, deals }: { call: Call; deals: { id: string; name: string }[] }) {
  const [notes, setNotes] = useState(call.notes ?? "");
  const [transcript, setTranscript] = useState(call.transcript ?? "");
  const [consent, setConsent] = useState(call.consent_to_record);
  const [apply, setApply] = useState({ evidence: true, nextStep: true, tasks: true, objections: true });
  const [dealId, setDealId] = useState(deals[0]?.id ?? "");
  const save = useAction();
  const r = call.review;
  const dirty = notes !== (call.notes ?? "") || transcript !== (call.transcript ?? "") || consent !== call.consent_to_record;

  return (
    <div className="space-y-6">
      <Card title="What happened">
        <div className="space-y-3">
          {call.live_notes.length > 0 && (
            <div className="rounded-md bg-slate-50 p-3">
              <div className="label">Captured live ({call.live_notes.length})</div>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {call.live_notes.map((n, i) => (
                  <li key={i}>
                    <Badge>{n.kind}</Badge> {n.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label className="block">
            <span className="label">Your notes</span>
            <textarea className="input min-h-[120px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the buyer say? Numbers, names, concerns, what was agreed…" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>All participants were notified and consented to recording/transcription, per our policy and local law.</span>
          </label>
          {consent && (
            <label className="block">
              <span className="label">Transcript (paste)</span>
              <textarea className="input min-h-[140px] font-mono text-xs" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              disabled={!dirty || save.pending}
              onClick={() => save.exec(() => updateCall(call.id, { notes, transcript: consent ? transcript : null, consent_to_record: consent }))}
            >
              {save.pending && <Spinner />} Save
            </button>
            {!dirty && (
              <ActionButton className="btn-primary" action={() => reviewCall(call.id)} pendingText="Extracting evidence…">
                {r ? "Re-run AI review" : "Run AI review"}
              </ActionButton>
            )}
            {dirty && <span className="self-center text-xs text-slate-500">Save before running the review.</span>}
          </div>
          <ErrorText error={save.error} />
        </div>
      </Card>

      {r && (
        <>
          <Card title="Summary">
            <p className="text-sm text-slate-700">{r.summary}</p>
            {r.missing_evidence.length > 0 && (
              <div className="mt-3 rounded-md bg-amber-50 p-3">
                <div className="label text-amber-800">Still missing — plan the next call around these</div>
                <List items={r.missing_evidence} />
              </div>
            )}
          </Card>

          <Card title="Update the deal record">
            {!call.deal_id ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">This call isn&apos;t linked to a deal. Link one to write the evidence.</p>
                {deals.length ? (
                  <div className="flex gap-2">
                    <select className="input" value={dealId} onChange={(e) => setDealId(e.target.value)}>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ActionButton action={() => linkCallToDeal(call.id, dealId)}>Link</ActionButton>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No open deals on this account. Create one from the account page if this conversation qualifies.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Review what the AI extracted. Nothing is written until you apply it, and nothing already recorded is removed.</p>
                <details className="rounded-md border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Extracted evidence</summary>
                  <div className="mt-3">
                    <DocView value={r.evidence_updates as unknown as Json} />
                  </div>
                </details>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {(
                    [
                      ["evidence", "Merge extracted evidence"],
                      ["nextStep", `Set next step${r.next_step.purpose ? `: ${r.next_step.purpose}` : " (none agreed)"}`],
                      ["tasks", `Create ${r.commitments.length} commitment task(s)`],
                      ["objections", `Log ${r.objections.length} objection(s)`],
                    ] as const
                  ).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2">
                      <input type="checkbox" className="accent-brand-600" checked={apply[k]} onChange={(e) => setApply({ ...apply, [k]: e.target.checked })} />
                      {l}
                    </label>
                  ))}
                </div>
                <ActionButton className="btn-primary" action={() => applyReview(call.id, apply)} pendingText="Applying…">
                  Apply to deal
                </ActionButton>
              </div>
            )}
          </Card>

          <Card title="Recap email draft" actions={<CopyButton text={`Subject: ${r.recap_email.subject}\n\n${r.recap_email.body}`} />}>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-800">
                Subject: <span className="font-normal text-slate-700">{r.recap_email.subject}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-sm">
                {r.recap_email.body}
              </div>
              <p className="text-[11px] text-slate-400">
                Factual recap of what was heard and agreed. Review before sending from your own mailbox.
              </p>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Commitments & Tasks">
              <List items={r.commitments.map((c) => `${c.text} — ${c.owner || "owner TBC"}${c.due ? `, ${c.due}` : ""}`)} empty="None captured." />
            </Card>
            <Card title="Objections → Upstream Origin">
              <List items={r.objections.map((o) => `“${o.text}” → ${o.origin_stage}${o.missing_belief ? ` (missing: ${o.missing_belief})` : ""}`)} empty="None." />
            </Card>
          </div>

          <Card title="Performance Coaching">
            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="eyebrow text-emerald-900 flex items-center gap-1.5 font-bold">
                  <span>✓</span> What went well
                </div>
                <List items={r.coaching.strengths} />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                <div className="eyebrow text-amber-900 flex items-center gap-1.5 font-bold">
                  <span>⚡</span> Try next time
                </div>
                <List items={r.coaching.improvements} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="eyebrow text-slate-700 flex items-center gap-1.5 font-bold">
                  <span>⚑</span> Stages rushed or skipped
                </div>
                <List items={r.coaching.stage_skipped} empty="None." />
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
