"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Foundation, FoundationContent } from "@/lib/types";
import {
  approveFoundation,
  generateFoundationPart,
  newFoundationDraft,
  runInterview,
  saveFoundationContent,
} from "@/app/actions/products";
import { ActionButton, ErrorText, Spinner } from "@/components/actions";
import { Badge, Card, Empty, fmtDate } from "@/components/ui";
import { DocEditor, DocView, type Json } from "@/components/json-doc";

const PARTS = [
  { key: "positioning", title: "Positioning", hint: "One-liner, narrative, differentiators, alternatives" },
  { key: "market", title: "Market & buyers", hint: "ICP, triggers, disqualifiers, tiers, buyer committee" },
  { key: "offer", title: "Offer & proof", hint: "Outcomes, proof inventory, evidence gaps, package, pricing hypotheses" },
  { key: "motion", title: "Sales motion", hint: "Objection map, stages & exits, qualification, allowed claims" },
] as const;
type PartKey = (typeof PARTS)[number]["key"];

export function FoundationWorkspace({
  productId,
  approved,
  draft,
  unanswered,
  interviewed,
}: {
  productId: string;
  approved: Foundation | null;
  draft: Foundation | null;
  unanswered: number;
  interviewed: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<"draft" | "approved">(draft ? "draft" : "approved");
  const [selectedPart, setSelectedPart] = useState<PartKey | "all">("all");
  const [progress, setProgress] = useState<PartKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const [editing, setEditing] = useState<PartKey | null>(null);
  const [editValue, setEditValue] = useState<Json>(null);
  const [saving, setSaving] = useState(false);

  const shown = view === "draft" ? draft : approved;
  const content = (shown?.content ?? {}) as FoundationContent;
  const isDraft = shown?.status === "draft";

  async function generate(parts: PartKey[], fresh: boolean) {
    setError(null);
    for (let i = 0; i < parts.length; i++) {
      setProgress(parts[i]);
      const res = await generateFoundationPart(productId, parts[i], fresh && i === 0);
      if (!res.ok) {
        setError(res.error);
        break;
      }
      router.refresh();
    }
    setProgress(null);
    setView("draft");
    start(() => router.refresh());
  }

  async function saveEdit(part: PartKey) {
    if (!shown) return;
    setSaving(true);
    const res = await saveFoundationContent(shown.id, { ...content, [part]: editValue } as FoundationContent);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  const generating = progress !== null;

  return (
    <div className="space-y-6">
      {/* Interview + generation controls */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <h2 className="h-section">Sales Foundation</h2>
          <p className="muted mt-1">
            Reusable company truth for this product. Claims are labelled{" "}
            <Badge tone="blue">company provided</Badge> <Badge tone="violet">public research</Badge>{" "}
            <Badge tone="amber">ai hypothesis</Badge> <Badge tone="green">buyer confirmed</Badge>. External messages only use an approved version.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!draft && !approved && (
              <button className="btn btn-primary" disabled={generating} onClick={() => generate(PARTS.map((p) => p.key), true)}>
                {generating && <Spinner />} Generate Sales Foundation
              </button>
            )}
            {draft && (
              <>
                <button className="btn" disabled={generating} onClick={() => generate(PARTS.map((p) => p.key), true)}>
                  {generating && <Spinner />} Regenerate all
                </button>
                <ActionButton
                  className="btn-primary"
                  action={() => approveFoundation(draft.id)}
                  pendingText="Approving…"
                  onDone={() => setView("approved")}
                >
                  Approve v{draft.version}
                </ActionButton>
              </>
            )}
            {approved && !draft && (
              <ActionButton action={() => newFoundationDraft(productId)} onDone={() => setView("draft")}>
                Start new draft (v{approved.version + 1})
              </ActionButton>
            )}
          </div>
          {generating && (
            <div className="mt-5 animate-rise border-t border-slate-200 pt-4">
              <div className="eyebrow mb-2 text-brand-800">Building sales foundation</div>
              <div className="flow-line mb-3" />
              <ul className="space-y-1.5 text-sm">
                <li className="flex gap-2.5 text-slate-500">
                  <span className="w-3 text-center text-emerald-700">✓</span> Reading company information and proof
                </li>
                {PARTS.map((p, i) => {
                  const idx = PARTS.findIndex((x) => x.key === progress);
                  const state = i < idx ? "done" : i === idx ? "active" : "todo";
                  return (
                    <li key={p.key} className={clsx("flex gap-2.5", state === "done" ? "text-slate-500" : state === "active" ? "font-medium text-slate-900" : "text-slate-400")}>
                      <span className={clsx("w-3 text-center", state === "done" ? "text-emerald-700" : state === "active" ? "animate-pulse text-gold" : "text-slate-300")}>
                        {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                      </span>
                      {state === "active" ? `Building ${p.title.toLowerCase()}` : p.title}
                      <span className="text-xs font-normal text-slate-400">· {p.hint}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <ErrorText error={error} />
        </div>
        <div className="card card-pad">
          <h2 className="h-section">AI interview</h2>
          <p className="muted mt-1">
            {interviewed
              ? unanswered
                ? `${unanswered} question${unanswered === 1 ? "" : "s"} waiting for your answer. Answers sharpen the foundation.`
                : "All interview questions answered."
              : "Let the strategist find gaps in your intake before drafting."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton action={() => runInterview(productId)} pendingText="Reviewing intake…" onDone={() => router.push(`/products/${productId}/intake#interview`)}>
              {interviewed ? "Ask more questions" : "Interview me about gaps"}
            </ActionButton>
            {interviewed && (
              <Link className="btn" href={`/products/${productId}/intake#interview`}>
                Answer
              </Link>
            )}
          </div>
        </div>
      </div>

      {(draft || approved) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedPart("all")}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                selectedPart === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              All Parts (4)
            </button>
            {PARTS.map((p) => {
              const hasContent = !!(content as Record<string, Json>)[p.key];
              const isSelected = selectedPart === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPart(p.key)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    isSelected ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>{p.title}</span>
                  {hasContent && <span className={clsx("h-1.5 w-1.5 rounded-full", isSelected ? "bg-gold" : "bg-emerald-500")} />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
              {draft && (
                <button onClick={() => setView("draft")} className={clsx("rounded px-2.5 py-1 font-medium transition-all", view === "draft" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
                  Draft v{draft.version}
                </button>
              )}
              {approved && (
                <button onClick={() => setView("approved")} className={clsx("rounded px-2.5 py-1 font-medium transition-all", view === "approved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
                  Approved v{approved.version}
                </button>
              )}
            </div>
            {shown?.status === "approved" && <span className="text-[11px] text-slate-400">Approved {fmtDate(shown.approved_at)}</span>}
          </div>
        </div>
      )}

      {!shown && !generating && (
        <Empty title="No foundation yet">
          Generate a draft from your intake. You&apos;ll review every claim, correct its source label, and approve it before it&apos;s used in outreach.
        </Empty>
      )}

      {shown &&
        PARTS.filter((p) => selectedPart === "all" || p.key === selectedPart).map((p) => {
          const section = (content as Record<string, Json>)[p.key];
          return (
            <Card
              key={p.key}
              title={
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{p.title}</span>
                  <span className="hidden sm:inline text-xs font-normal text-slate-400">· {p.hint}</span>
                </span>
              }
              actions={
                isDraft &&
                !generating && (
                  editing === p.key ? (
                    <div className="flex items-center gap-2">
                      <button className="btn btn-sm" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                      <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => saveEdit(p.key)}>
                        {saving && <Spinner />} Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-sm btn-ghost" onClick={() => generate([p.key], false)}>
                        Regenerate
                      </button>
                      {section && (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setEditValue(structuredClone(section));
                            setEditing(p.key);
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )
                )
              }
            >
              {editing === p.key ? (
                <DocEditor value={editValue} onChange={setEditValue} />
              ) : section ? (
                <DocView value={section} />
              ) : (
                <p className="muted">Not generated yet.</p>
              )}
            </Card>
          );
        })}
    </div>
  );
}
