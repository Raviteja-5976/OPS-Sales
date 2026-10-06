"use client";

import { useState } from "react";
import clsx from "clsx";
import type { CheckResult, Contact, Sequence, SequenceContent, SequenceStep } from "@/lib/types";
import { approveSequence, runAIReview, saveSequence, setSequenceStatus } from "@/app/actions/outreach";
import { optOutContact } from "@/app/actions/accounts";
import { ActionButton, CopyButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Badge, Card, List } from "@/components/ui";

const CHECK_STYLE = {
  fail: { mark: "✕", markCls: "text-red-600", text: "text-red-700" },
  warn: { mark: "◐", markCls: "text-amber-600", text: "text-slate-900" },
  pass: { mark: "✓", markCls: "text-emerald-700", text: "text-slate-600" },
};

export function SequenceEditor({ seq, contact }: { seq: Sequence; contact: Contact | null }) {
  const [c, setC] = useState<SequenceContent>(seq.content);
  const [activeTab, setActiveTab] = useState<"steps" | "scripts" | "replies">("steps");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const save = useAction();
  const editable = seq.status === "draft" || seq.status === "rejected";
  const dirty = JSON.stringify(c) !== JSON.stringify(seq.content);
  const checks = (seq.checks ?? []) as CheckResult[];
  const fails = checks.filter((x) => x.status === "fail");
  const order = { fail: 0, warn: 1, pass: 2 };
  const sorted = [...checks].sort((a, b) => order[a.status] - order[b.status]);

  const setStep = (i: number, patch: Partial<SequenceStep>) => setC({ ...c, steps: c.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Why this message exists">
          <div className="space-y-3">
            <div className="rounded-xl border border-gold/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-4">
              <p className="text-[14px] leading-relaxed font-medium text-slate-800">{c.rationale}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Opening basis:</span>{" "}
              {c.opening_basis.kind === "cited_signal" ? <Badge tone="violet">cited signal</Badge> : <Badge tone="amber">role hypothesis</Badge>}
              <span className="font-medium text-slate-800">{c.opening_basis.text}</span>
              {c.opening_basis.source && <span className="text-slate-400">({c.opening_basis.source})</span>}
            </div>
          </div>
        </Card>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab("steps")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "steps" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span>Touchpoints & Steps</span>
            <span className={clsx("rounded-full px-1.5 py-0.2 text-[10px] font-bold", activeTab === "steps" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700")}>
              {c.steps.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("scripts")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "scripts" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span>Phone & Social Scripts</span>
          </button>
          <button
            onClick={() => setActiveTab("replies")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "replies" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span>Reply Playbook & Variants</span>
            {c.reply_branches.length > 0 && (
              <span className={clsx("rounded-full px-1.5 py-0.2 text-[10px] font-bold", activeTab === "replies" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700")}>
                {c.reply_branches.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: STEPS */}
        {activeTab === "steps" && (
          <div className="space-y-6 animate-rise">
            {c.steps.map((s, i) => (
              <Card
                key={i}
                title={
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-900">Step {i + 1}</span>
                    <Badge tone="blue">{s.channel}</Badge>
                    <span className="text-xs font-medium text-slate-500">Day {s.day}</span>
                  </span>
                }
                actions={
                  <div className="flex items-center gap-2">
                    <CopyButton text={s.subject ? `Subject: ${s.subject}\n\n${s.body}` : s.body} />
                    {editable && c.steps.length > 1 && (
                      <button className="btn btn-ghost btn-sm text-slate-400 hover:text-red-600" onClick={() => setC({ ...c, steps: c.steps.filter((_, j) => j !== i) })}>
                        Remove
                      </button>
                    )}
                  </div>
                }
              >
                {editable ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[100px_140px_1fr]">
                      <label className="block">
                        <span className="label">Day</span>
                        <input className="input" type="number" value={s.day} onChange={(e) => setStep(i, { day: Number(e.target.value) })} />
                      </label>
                      <label className="block">
                        <span className="label">Channel</span>
                        <select className="input" value={s.channel} onChange={(e) => setStep(i, { channel: e.target.value as SequenceStep["channel"] })}>
                          {["email", "phone", "linkedin", "voicemail"].map((ch) => (
                            <option key={ch}>{ch}</option>
                          ))}
                        </select>
                      </label>
                      {s.channel === "email" && (
                        <label className="block">
                          <span className="label">Subject Line</span>
                          <input className="input" placeholder="Subject" value={s.subject ?? ""} onChange={(e) => setStep(i, { subject: e.target.value })} />
                        </label>
                      )}
                    </div>
                    <div>
                      <span className="label">Message Body</span>
                      <textarea className="input min-h-[160px] font-sans" value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} />
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{s.body.split(/\s+/).filter(Boolean).length} words</div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {s.subject && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-800">
                        Subject: <span className="font-normal text-slate-700">{s.subject}</span>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-sm shadow-sm">
                      {s.body}
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50/60 p-2.5">
                    <b className="font-semibold text-slate-700">Reason to respond:</b> {s.reason_to_respond}
                  </div>
                  <div className="rounded-lg bg-slate-50/60 p-2.5">
                    <b className="font-semibold text-slate-700">Stop if:</b> {s.stop_if}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: SCRIPTS */}
        {activeTab === "scripts" && (
          <div className="grid gap-6 md:grid-cols-2 animate-rise">
            <Card title="Cold Call Opener" actions={<CopyButton text={c.call_opener} />}>
              {editable ? (
                <textarea className="input min-h-[120px]" value={c.call_opener} onChange={(e) => setC({ ...c, call_opener: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-brand-200 bg-surface-warm p-3.5 text-sm font-medium text-slate-900 leading-relaxed">
                  “{c.call_opener}”
                </div>
              )}
            </Card>
            <Card title="Voicemail Script" actions={<CopyButton text={c.voicemail} />}>
              {editable ? (
                <textarea className="input min-h-[120px]" value={c.voicemail} onChange={(e) => setC({ ...c, voicemail: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-800 leading-relaxed">
                  “{c.voicemail}”
                </div>
              )}
            </Card>
            <Card title="LinkedIn Connection Note" actions={<CopyButton text={c.linkedin_note} />}>
              {editable ? (
                <textarea className="input min-h-[100px]" value={c.linkedin_note} onChange={(e) => setC({ ...c, linkedin_note: e.target.value })} />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-800 leading-relaxed">
                  {c.linkedin_note}
                </div>
              )}
            </Card>
            <Card title="Automatic Stop Conditions">
              <List items={c.stop_conditions} />
            </Card>
          </div>
        )}

        {/* TAB 3: REPLIES & VARIANTS */}
        {activeTab === "replies" && (
          <div className="space-y-6 animate-rise">
            <Card title="Reply Playbook & Branches">
              <div className="space-y-3">
                {c.reply_branches.map((b, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">If they reply:</span>
                      <span className="font-semibold text-slate-900">{b.if_reply}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      <strong className="text-slate-800 block mb-1">Recommended Response:</strong>
                      {b.respond_with}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {(c.variants ?? []).length > 0 && (
              <Card title="Alternative Email Openers">
                <div className="grid gap-3 md:grid-cols-2">
                  {c.variants!.map((v, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{v.label}</span>
                        {editable && (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              const first = c.steps.findIndex((s) => s.channel === "email");
                              if (first >= 0) setStep(first, { subject: v.subject, body: v.body });
                            }}
                          >
                            Use as first email
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Intent: {v.intent}</p>
                      <div className="text-xs text-slate-700 rounded bg-slate-50 p-2.5 whitespace-pre-wrap">{v.body}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="lg:sticky lg:top-6 space-y-6">
          <Card title="Quality check" actions={<span className="num text-xs text-slate-500">{checks.filter((x) => x.status === "pass").length}/{checks.length} passing</span>}>
            <ul className="space-y-2">
              {sorted.map((x) => (
                <li key={x.key} className="flex gap-2 text-sm">
                  <span className={clsx("w-3 shrink-0 text-center font-semibold", CHECK_STYLE[x.status].markCls)}>{CHECK_STYLE[x.status].mark}</span>
                  <div>
                    <div className={clsx("font-medium", CHECK_STYLE[x.status].text)}>{x.label}</div>
                    <div className="text-xs text-slate-500">{x.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            {editable && (
              <div className="mt-4">
                <ActionButton className="btn-sm w-full" action={() => runAIReview(seq.id)} pendingText="Reviewing…">
                  Run AI quality review
                </ActionButton>
              </div>
            )}
          </Card>

          <Card title="Approval">
            <div className="space-y-3">
              {editable && (
                <>
                  <button className="btn w-full" disabled={!dirty || save.pending} onClick={() => save.exec(() => saveSequence(seq.id, c))}>
                    {save.pending && <Spinner />} Save edits & re-check
                  </button>
                  <ErrorText error={save.error} />
                  {dirty ? (
                    <p className="text-xs text-slate-500">Save your edits before approving.</p>
                  ) : fails.length ? (
                    <p className="text-xs text-red-600">Fix {fails.length} failing check(s) to approve.</p>
                  ) : null}
                  <ActionButton className="btn-primary w-full" action={() => approveSequence(seq.id)} pendingText="Checking…">
                    Review & approve
                  </ActionButton>
                  {rejecting ? (
                    <div className="space-y-2">
                      <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <ActionButton className="btn-danger w-full" action={() => setSequenceStatus(seq.id, "rejected", reason)} onDone={() => setRejecting(false)}>
                        Confirm reject
                      </ActionButton>
                    </div>
                  ) : (
                    seq.status === "draft" && (
                      <button className="btn btn-ghost w-full" onClick={() => setRejecting(true)}>
                        Reject
                      </button>
                    )
                  )}
                </>
              )}
              {seq.status === "approved" && (
                <>
                  <p className="text-sm text-slate-600">
                    Approved. Send each step from your own mailbox, phone or LinkedIn, then mark the sequence as sending so the activity is logged.
                  </p>
                  {contact?.email && c.steps[0]?.channel === "email" && (
                    <a
                      className="btn w-full"
                      href={`mailto:${contact.email}?subject=${encodeURIComponent(c.steps[0].subject ?? "")}&body=${encodeURIComponent(c.steps[0].body)}`}
                    >
                      Open step 1 in email client
                    </a>
                  )}
                  <ActionButton className="btn-primary w-full" action={() => setSequenceStatus(seq.id, "active")}>
                    Mark as sending
                  </ActionButton>
                  <ActionButton className="btn-ghost w-full" action={() => setSequenceStatus(seq.id, "draft")}>
                    Back to draft
                  </ActionButton>
                </>
              )}
              {seq.status === "active" && (
                <>
                  <ActionButton className="w-full" action={() => setSequenceStatus(seq.id, "completed", "Sequence finished")}>
                    Mark completed
                  </ActionButton>
                  <ActionButton className="btn-danger w-full" action={() => setSequenceStatus(seq.id, "stopped", "Stopped by seller")}>
                    Stop sequence
                  </ActionButton>
                </>
              )}
              {["stopped", "completed", "rejected"].includes(seq.status) && seq.status !== "rejected" && (
                <p className="text-sm text-slate-500">This sequence is closed.</p>
              )}
              {contact && !contact.opted_out && (
                <div className="border-t border-slate-100 pt-3">
                  <ActionButton className="btn-ghost btn-sm w-full text-red-600" confirmText="Record opt-out?" action={() => optOutContact(contact.id)}>
                    Recipient asked to opt out
                  </ActionButton>
                </div>
              )}
              {contact?.opted_out && <Badge tone="red">Recipient opted out — do not contact</Badge>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
