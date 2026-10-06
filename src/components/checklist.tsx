"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import type { ChecklistItem, ChecklistItemState, ChecklistRun, ChecklistTemplate } from "@/lib/types";
import { checklistProgress } from "@/lib/checklists";
import { setChecklistItem } from "@/app/actions/checklists";
import { ErrorText } from "./actions";

const AI_LABEL: Record<string, string> = {
  draft: "⚡ Can draft",
  calculate: "⚡ Calculator",
  research: "⚡ Research",
  coach: "⚡ Coach",
  summarize: "⚡ Summarize",
};

/** The checklist is a guided cockpit, not a task list (design §20). Readiness, not completion. */
export function Checklist({
  data,
  entityType,
  entityId,
  mode,
  compact,
  title,
}: {
  data: { template: ChecklistTemplate; run: ChecklistRun | null } | null;
  entityType: string;
  entityId: string;
  mode?: "prepare" | "live" | "review";
  compact?: boolean;
  title?: string;
}) {
  const [state, setState] = useState<Record<string, ChecklistItemState>>(data?.run?.state ?? {});
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [overriding, setOverriding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  if (!data) return <p className="muted">Checklist template not found. Check Playbooks.</p>;
  const { template } = data;
  const items = mode ? template.items.filter((i) => !i.mode || i.mode === mode) : template.items;
  const prog = checklistProgress(items, state);
  const required = items.filter((i) => i.required);

  function patch(item: ChecklistItem, p: ChecklistItemState) {
    setState((s) => ({ ...s, [item.id]: { ...(s[item.id] ?? {}), ...p } }));
    start(async () => {
      const res = await setChecklistItem(template.id, entityType, entityId, item.id, p);
      if (!res.ok) setError(res.error);
    });
  }

  const sections = [...new Set(items.map((i) => i.section ?? ""))];
  let n = 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="h-section">{title ?? template.name}</div>
          {!compact && template.description && <div className="mt-0.5 text-xs text-slate-500">{template.description}</div>}
        </div>
        <span className={clsx("text-xs font-medium", prog.ready ? "text-emerald-700" : "text-amber-700")}>
          {prog.ready ? "● Ready to advance" : `◐ ${prog.outstanding} required open`}
        </span>
      </div>

      {/* Readiness: one segment per required item */}
      {required.length > 0 && (
        <div className="mb-1 flex gap-[3px]" aria-label="Required items">
          {required.map((r) => {
            const st = state[r.id] ?? {};
            return (
              <span
                key={r.id}
                title={r.text}
                className={clsx("h-1.5 flex-1 rounded-[2px] transition-colors duration-200", st.done ? "bg-gold" : st.overridden ? "bg-amber-300" : "bg-slate-200")}
              />
            );
          })}
        </div>
      )}
      <div className="text-[11px] text-slate-500">
        {prog.reqDone}/{prog.required} required{prog.reqOverridden ? ` · ${prog.reqOverridden} skipped with reason` : ""}
      </div>

      <div className="mt-3 space-y-4">
        {sections.map((sec) => (
          <div key={sec}>
            {sec && <div className="eyebrow mb-1">{sec}</div>}
            <ol className="divide-y divide-slate-100">
              {items
                .filter((i) => (i.section ?? "") === sec)
                .map((item) => {
                  n += 1;
                  const st = state[item.id] ?? {};
                  const marker = st.done ? "●" : st.overridden ? "◐" : "○";
                  return (
                    <li key={item.id} className="group py-2.5">
                      <div className="flex items-start gap-3">
                        <span className="num w-5 shrink-0 pt-0.5 font-mono text-[11px] text-slate-400">{String(n).padStart(2, "0")}</span>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={!!st.done}
                          onClick={() => patch(item, { done: !st.done })}
                          className={clsx(
                            "mt-px w-4 shrink-0 text-center text-[13px] leading-5 transition-colors",
                            st.done ? "text-gold" : st.overridden ? "text-amber-500" : "text-slate-300 hover:text-slate-500",
                          )}
                          title={st.done ? "Mark as not done" : "Mark as done"}
                        >
                          {marker}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => patch(item, { done: !st.done })} className={clsx("text-left text-sm leading-5", st.done ? "text-slate-400" : "text-slate-900")}>
                            {item.text}
                            {!item.required && <span className="ml-1 text-xs text-slate-400">optional</span>}
                          </button>
                          {!compact && (item.why || item.ai_action) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                              {item.ai_action && <span className="font-medium text-brand-800">{AI_LABEL[item.ai_action]}</span>}
                              {item.why && <span>{item.why}</span>}
                            </div>
                          )}
                          {st.overridden && !st.done && <div className="mt-0.5 text-xs text-amber-700">Skipped: {st.override_reason}</div>}
                          {st.note && openNote !== item.id && <div className="mt-1 border-l-2 border-slate-200 pl-2 text-xs text-slate-600">{st.note}</div>}
                          {openNote === item.id && (
                            <textarea
                              autoFocus
                              className="input mt-1.5 text-xs"
                              defaultValue={st.note}
                              placeholder="Capture buyer response or evidence…"
                              onBlur={(e) => {
                                setOpenNote(null);
                                if (e.target.value !== (st.note ?? "")) patch(item, { note: e.target.value });
                              }}
                            />
                          )}
                          {overriding === item.id && (
                            <div className="mt-1.5 flex gap-2">
                              <input autoFocus className="input text-xs" placeholder="Why is it OK to proceed without this?" value={reason} onChange={(e) => setReason(e.target.value)} />
                              <button
                                className="btn btn-sm"
                                disabled={!reason.trim()}
                                onClick={() => {
                                  patch(item, { overridden: true, override_reason: reason.trim() });
                                  setOverriding(null);
                                  setReason("");
                                }}
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                          <button className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => setOpenNote(openNote === item.id ? null : item.id)}>
                            Note
                          </button>
                          {item.required && !st.done && !compact && (
                            <button className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => setOverriding(overriding === item.id ? null : item.id)}>
                              Skip
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
      </div>
      <ErrorText error={error} />
    </div>
  );
}
