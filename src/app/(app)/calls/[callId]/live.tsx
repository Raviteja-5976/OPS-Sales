"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Pause, RefreshCw, X } from "lucide-react";
import type { Call, ChecklistRun, ChecklistTemplate, LiveNote } from "@/lib/types";
import { BELIEFS, type BeliefKey } from "@/lib/types";
import type { RailItem } from "@/lib/readiness";
import { CONVERSATION_STAGES, OBJECTION_PATTERNS } from "@/lib/playbook";
import { diagnoseObjection, nextQuestion, updateCall } from "@/app/actions/calls";
import { ErrorText, Spinner } from "@/components/actions";
import { Logo, fmtMoney } from "@/components/ui";
import { Checklist } from "@/components/checklist";

type NextQ = { question: string; why: string; fills: string; listen_for: string[]; suggested_stage: number | null };
type Diagnosis = {
  cushion: string;
  isolate: string;
  likely_missing_belief: string;
  upstream_origin: string;
  diagnosis: string;
  suggested_question: string;
  return_to_stage: number | null;
  avoid: string[];
};

// Which evidence a quick-capture kind establishes, so "still unknown" shrinks live.
const KIND_FILLS: Record<string, string> = {
  Fact: "current",
  Metric: "current",
  Pain: "current",
  "Target metric": "desired",
  "Target date": "desired",
  "Gap confirmed": "value",
  Gap: "value",
  Roadblock: "roadblock",
  "Prior attempt": "roadblock",
  "Cost of inaction": "coi",
  Stakeholder: "stakeholders",
  "Decision step": "decision",
  Risk: "implementation",
  "Next step": "next",
};

function useElapsed() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function LiveCopilot({
  call,
  accountName,
  rail,
  checklist,
}: {
  call: Call;
  accountName: string;
  rail: RailItem[] | null;
  checklist: { template: ChecklistTemplate; run: ChecklistRun | null } | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(call.current_stage || 1);
  const [promptIdx, setPromptIdx] = useState(0);
  const [notes, setNotes] = useState<LiveNote[]>(call.live_notes ?? []);
  const [text, setText] = useState("");
  const [kind, setKind] = useState("Note");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<"gap" | "objection" | "next" | "checklist">("objection");
  const elapsed = useElapsed();
  const first = useRef(true);
  const captureRef = useRef<HTMLInputElement>(null);

  // Silence cue
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [pauseNow, setPauseNow] = useState(0);
  useEffect(() => {
    if (pauseStart === null) return;
    const t = setInterval(() => setPauseNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [pauseStart]);
  const pauseSecs = pauseStart ? Math.max(0, (pauseNow - pauseStart) / 1000) : 0;

  const [nq, setNq] = useState<NextQ | null>(null);
  const [nqBusy, setNqBusy] = useState(false);
  const [objText, setObjText] = useState("");
  const [diag, setDiag] = useState<(Diagnosis & { source: "pattern" | "ai" }) | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [gap, setGap] = useState({ current: "", target: "", metric: "", coi: "" });
  const [ns, setNs] = useState({ optionA: "", optionB: "", owner: "", date: "", purpose: "" });

  // Debounced autosave
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaving("saving");
    const t = setTimeout(async () => {
      const res = await updateCall(call.id, { live_notes: notes, current_stage: stage });
      if (!res.ok) setError(res.error);
      setSaving(res.ok ? "saved" : "idle");
    }, 1200);
    return () => clearTimeout(t);
  }, [notes, stage, call.id]);

  // Esc exits focus without ending the call
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const paletteOpen = !!document.querySelector('[aria-label="Command palette"]');
      if (e.key === "Escape" && !paletteOpen && !(e.target as HTMLElement)?.closest?.("input,textarea")) router.push(`/calls/${call.id}?mode=prepare`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, call.id]);

  const st = CONVERSATION_STAGES.find((s) => s.n === stage)!;
  const prompt = st.prompts[promptIdx % st.prompts.length];

  const filledLive = useMemo(() => new Set(notes.map((n) => KIND_FILLS[n.kind]).filter(Boolean)), [notes]);
  const known = [
    ...(rail ?? []).filter((r) => r.state !== "missing").map((r) => ({ label: r.label, value: r.value })),
    ...notes.filter((n) => KIND_FILLS[n.kind]).map((n) => ({ label: n.kind, value: n.text })),
  ];
  const unknown = (rail ?? []).filter((r) => r.state === "missing" && !filledLive.has(r.key));

  function capture(k: string, t: string) {
    if (!t.trim()) return;
    setNotes((n) => [...n, { at: new Date().toISOString(), stage, kind: k, text: t.trim() }]);
  }

  async function askNext() {
    setNqBusy(true);
    setError(null);
    const res = await nextQuestion(call.id, stage, notes);
    setNqBusy(false);
    if (res.ok) setNq(res.data as NextQ);
    else setError(res.error);
  }

  function applyPattern(key: string) {
    const p = OBJECTION_PATTERNS.find((o) => o.key === key)!;
    setObjText(p.statement);
    setDiag({
      source: "pattern",
      cushion: p.cushion,
      isolate: p.isolate,
      likely_missing_belief: p.missingBelief,
      upstream_origin: `${p.primaryOrigin} (or ${p.secondaryOrigin})`,
      diagnosis: p.mechanism,
      suggested_question: p.response,
      return_to_stage: p.returnToStage,
      avoid: ["Arguing or contradicting", "Discounting", "Defending with more features"],
    });
    capture("Objection", p.statement);
  }

  async function diagnoseAI() {
    if (!objText.trim()) return;
    setDiagBusy(true);
    setError(null);
    const res = await diagnoseObjection(call.id, objText, stage);
    setDiagBusy(false);
    if (res.ok) {
      setDiag({ ...(res.data as Diagnosis), source: "ai" });
      if (!notes.some((n) => n.kind === "Objection" && n.text === objText.trim())) capture("Objection", objText);
    } else setError(res.error);
  }

  async function endCall() {
    const res = await updateCall(call.id, { live_notes: notes, current_stage: stage, status: "completed" });
    if (!res.ok) return setError(res.error);
    router.push(`/calls/${call.id}?mode=review`);
  }

  const gapValue = gap.current && gap.target ? Number(gap.target) - Number(gap.current) : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas">
      {/* Focus header */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={22} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-slate-900">{accountName}</div>
            <div className="text-xs text-slate-500">
              <span className="capitalize">{call.kind.replace("_", " ")}</span> · Stage {st.n} · {st.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-[11px] text-slate-400 sm:inline">{saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : ""}</span>
          <span className="num font-mono text-xl font-semibold text-slate-900">{elapsed}</span>
          {pauseStart === null ? (
            <button className="btn" onClick={() => setPauseStart(Date.now())} title="After a key question or stating the price">
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button
              className={clsx("btn font-mono", pauseSecs < 3 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-800")}
              onClick={() => setPauseStart(null)}
            >
              {pauseSecs < 3 ? "Hold the silence" : "Let them speak"} {pauseSecs.toFixed(1)}s
            </button>
          )}
          <button className="btn btn-primary" onClick={endCall}>
            End call <ArrowRight size={14} />
          </button>
          <Link href={`/calls/${call.id}?mode=prepare`} className="btn btn-ghost px-2" title="Exit focus (Esc)">
            <X size={16} />
          </Link>
        </div>
      </header>

      {/* Stage stepper */}
      <div className="flex gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6">
        {CONVERSATION_STAGES.map((s) => (
          <button
            key={s.n}
            onClick={() => {
              setStage(s.n);
              setPromptIdx(0);
              setNq(null);
            }}
            className={clsx(
              "relative whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors",
              s.n === stage ? "text-slate-900" : s.n < stage ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-700",
            )}
          >
            <span className="num mr-1 font-mono text-[10px] opacity-60">{s.n}</span>
            {s.name}
            {s.n === stage && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Focus column */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="eyebrow text-brand-800">{st.name}</div>
              <p key={`${stage}-${promptIdx}`} className="mx-auto mt-3 max-w-2xl animate-rise text-[22px] font-medium leading-snug tracking-[-0.01em] text-slate-900 sm:text-[26px]">
                “{prompt}”
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
                <span>Move on when: {st.exitGate}</span>
                {st.prompts.length > 1 && (
                  <button className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900" onClick={() => setPromptIdx((i) => i + 1)}>
                    <RefreshCw size={12} /> Another
                  </button>
                )}
              </div>
              {st.guardrail && <p className="mx-auto mt-3 max-w-xl text-xs text-amber-700">⚑ {st.guardrail}</p>}
            </div>

            {/* Known / still unknown */}
            <div className="mt-8 grid gap-6 border-y border-slate-200 py-5 sm:grid-cols-2">
              <div>
                <div className="eyebrow mb-2">Known</div>
                {known.length === 0 ? (
                  <p className="text-sm text-slate-400">Nothing established yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {known.slice(-8).map((k, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-700">✓</span>
                        <span className="min-w-0">
                          <span className="text-slate-500">{k.label}: </span>
                          <span className="text-slate-900">{k.value}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="eyebrow mb-2">Still unknown</div>
                {rail === null ? (
                  <p className="text-sm text-slate-400">Link this call to an opportunity to track evidence.</p>
                ) : unknown.length === 0 ? (
                  <p className="text-sm text-emerald-700">● Every core piece of evidence is established.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {unknown.map((u) => (
                      <li key={u.key} className="flex gap-2 text-slate-700">
                        <span className="text-slate-400">○</span>
                        {u.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Next question */}
            <section className="relative mt-6 overflow-hidden rounded-lg border border-brand-200 bg-surface-warm">
              <div className="absolute inset-y-0 left-0 w-1 bg-gold" />
              <div className="py-4 pl-6 pr-5">
                <div className="eyebrow text-brand-800">⚡ Next question</div>
                {nqBusy ? (
                  <div className="mt-3 space-y-2">
                    <div className="flow-line" />
                    <p className="text-xs text-slate-500">Reading what&apos;s still unknown…</p>
                  </div>
                ) : nq ? (
                  <div className="animate-rise">
                    <p className="mt-2 text-[19px] font-medium leading-snug text-slate-900">“{nq.question}”</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Fills: {nq.fills} · {nq.why}
                    </p>
                    {nq.listen_for.length > 0 && <p className="mt-0.5 text-xs text-slate-500">Listen for: {nq.listen_for.join(" · ")}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Get one question that targets the most important missing evidence.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {nq && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        capture("Question asked", nq.question);
                        if (nq.suggested_stage && nq.suggested_stage !== stage) setStage(nq.suggested_stage);
                        setNq(null);
                        captureRef.current?.focus();
                      }}
                    >
                      Ask this
                    </button>
                  )}
                  <button className={clsx("btn", !nq && "btn-primary")} onClick={askNext} disabled={nqBusy}>
                    {nqBusy && <Spinner />} {nq ? "Another" : "Suggest a question"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => captureRef.current?.focus()}>
                    Capture note
                  </button>
                </div>
              </div>
            </section>

            {/* Capture */}
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[...st.quickCaptures, "Note", "Quote"].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setKind(k);
                      captureRef.current?.focus();
                    }}
                    className={clsx("rounded-full px-2.5 py-1 text-xs font-medium transition-colors", kind === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  capture(kind, text);
                  setText("");
                }}
              >
                <input ref={captureRef} className="input py-2.5 text-base" value={text} onChange={(e) => setText(e.target.value)} placeholder={`${kind} — press Enter to capture`} autoFocus />
              </form>
              <ul className="mt-3 space-y-1">
                {[...notes].reverse().slice(0, 12).map((n, i) => {
                  const idx = notes.length - 1 - i;
                  return (
                    <li key={idx} className="group flex items-start gap-2 text-sm">
                      <span className="w-24 shrink-0 truncate pt-px text-[11px] font-medium uppercase tracking-[0.04em] text-slate-400">{n.kind}</span>
                      <span className="min-w-0 flex-1 text-slate-800">{n.text}</span>
                      <button className="text-xs text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={() => setNotes(notes.filter((_, j) => j !== idx))}>
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <ErrorText error={error} />
          </div>
        </main>

        {/* Tools drawer */}
        <aside className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white lg:w-[340px] lg:border-l lg:border-t-0">
          <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white">
            {(
              [
                ["objection", "Objection"],
                ["gap", "Gap"],
                ["next", "Next step"],
                ["checklist", "Checklist"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTool(k)}
                className={clsx("relative flex-1 py-2.5 text-xs font-medium transition-colors", tool === k ? "text-slate-900" : "text-slate-500 hover:text-slate-800")}
              >
                {l}
                {tool === k && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold" />}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tool === "objection" && (
              <div>
                <p className="mb-2 text-xs text-slate-500">Validate, isolate, diagnose the missing belief, then ask.</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {OBJECTION_PATTERNS.map((p) => (
                    <button key={p.key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-200" onClick={() => applyPattern(p.key)}>
                      {p.statement}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input" placeholder="What did they say?" value={objText} onChange={(e) => setObjText(e.target.value)} />
                  <button className="btn" onClick={diagnoseAI} disabled={diagBusy || !objText.trim()} title="Diagnose with AI">
                    {diagBusy ? <Spinner /> : "Diagnose"}
                  </button>
                </div>
                {diag && (
                  <ol className="mt-4 animate-rise space-y-3 text-sm">
                    <li>
                      <div className="eyebrow">01 Validate</div>“{diag.cushion}”
                    </li>
                    <li>
                      <div className="eyebrow">02 Isolate</div>“{diag.isolate}”
                    </li>
                    <li>
                      <div className="eyebrow">03 Likely missing</div>
                      <span className="font-medium text-amber-700">◐ {BELIEFS[diag.likely_missing_belief as BeliefKey]?.label ?? diag.likely_missing_belief}</span>
                      <span className="text-xs text-slate-500"> · from {diag.upstream_origin}</span>
                      <p className="mt-0.5 text-xs text-slate-600">{diag.diagnosis}</p>
                    </li>
                    <li>
                      <div className="eyebrow">04 Then</div>
                      {diag.suggested_question}
                    </li>
                    {diag.avoid.length > 0 && <li className="text-xs text-red-600">Avoid: {diag.avoid.join(" · ")}</li>}
                    {diag.return_to_stage && diag.return_to_stage !== stage && (
                      <button className="btn btn-sm w-full" onClick={() => setStage(diag.return_to_stage!)}>
                        Go back to stage {diag.return_to_stage}
                      </button>
                    )}
                  </ol>
                )}
              </div>
            )}

            {tool === "gap" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Current → desired → gap. Use the buyer&apos;s own numbers.</p>
                <input className="input" placeholder="Metric (e.g. monthly revenue)" value={gap.metric} onChange={(e) => setGap({ ...gap, metric: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input className="input" type="number" placeholder="Today" value={gap.current} onChange={(e) => setGap({ ...gap, current: e.target.value })} />
                  <span className="text-slate-400">→</span>
                  <input className="input" type="number" placeholder="Target" value={gap.target} onChange={(e) => setGap({ ...gap, target: e.target.value })} />
                </div>
                {gapValue !== null && (
                  <p className="text-sm">
                    Gap <span className="num text-lg font-semibold">{gapValue.toLocaleString()}</span> {gap.metric && <span className="text-slate-500">in {gap.metric}</span>}
                  </p>
                )}
                <input className="input" type="number" placeholder="Cost of waiting per month" value={gap.coi} onChange={(e) => setGap({ ...gap, coi: e.target.value })} />
                {gap.coi && <p className="text-xs text-slate-500">Two quarters of delay ≈ {fmtMoney(Number(gap.coi) * 6)}</p>}
                <button
                  className="btn btn-sm w-full"
                  disabled={gapValue === null && !gap.coi}
                  onClick={() =>
                    capture(
                      "Gap",
                      [gapValue !== null && `${gap.metric || "Metric"}: today ${gap.current} → target ${gap.target} (gap ${gapValue})`, gap.coi && `cost of inaction ~${gap.coi}/month`, "— buyer confirmed"]
                        .filter(Boolean)
                        .join("; "),
                    )
                  }
                >
                  Capture as buyer-confirmed
                </button>
              </div>
            )}

            {tool === "next" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Offer two concrete options, not &quot;when are you free?&quot;</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Tue 10:00" value={ns.optionA} onChange={(e) => setNs({ ...ns, optionA: e.target.value })} />
                  <input className="input" placeholder="Thu 14:00" value={ns.optionB} onChange={(e) => setNs({ ...ns, optionB: e.target.value })} />
                </div>
                {ns.optionA && ns.optionB && <p className="rounded-md bg-surface-warm px-3 py-2 text-sm">“Would {ns.optionA} or {ns.optionB} work better?”</p>}
                <input className="input" placeholder="Agreed purpose" value={ns.purpose} onChange={(e) => setNs({ ...ns, purpose: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Owner" value={ns.owner} onChange={(e) => setNs({ ...ns, owner: e.target.value })} />
                  <input className="input" type="date" value={ns.date} onChange={(e) => setNs({ ...ns, date: e.target.value })} />
                </div>
                <button className="btn btn-sm w-full" disabled={!ns.purpose || !ns.date} onClick={() => capture("Next step", `${ns.purpose} — owner ${ns.owner || "TBC"}, ${ns.date}`)}>
                  Capture next step
                </button>
              </div>
            )}

            {tool === "checklist" && <Checklist data={checklist} entityType="call" entityId={call.id} mode="live" compact title="During the call" />}
          </div>
        </aside>
      </div>
    </div>
  );
}
