"use client";

import { useState } from "react";
import { SOURCE_LABELS, type ProofItem, type SourceLabel } from "@/lib/types";
import { addProof, deleteProof, setProofApproval } from "@/app/actions/products";
import { ActionButton, ErrorText, useAction } from "@/components/actions";
import { Badge, Card, Empty, List, SourceBadge } from "@/components/ui";

const KINDS = ["case_study", "testimonial", "metric", "security", "integration", "reference", "other"];

export function ProofLibrary({ productId, proof, gaps }: { productId: string; proof: ProofItem[]; gaps: string[] }) {
  const blank = { kind: "case_study", title: "", body: "", source_label: "company-provided" as SourceLabel, source_url: "" };
  const [form, setForm] = useState(blank);
  const { pending, error, exec } = useAction();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {proof.length === 0 ? (
          <Empty title="No proof yet">Add case studies, metrics, testimonials and security facts. Only items you approve can appear in outreach.</Empty>
        ) : (
          proof.map((p) => (
            <div key={p.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{p.title}</span>
                    <Badge>{p.kind.replace("_", " ")}</Badge>
                    <SourceBadge source={p.source_label} />
                    {p.approved_for_outreach ? <Badge tone="green">Approved for outreach</Badge> : <Badge tone="amber">Not approved</Badge>}
                  </div>
                  {p.body && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{p.body}</p>}
                  {p.source_url && (
                    <a href={p.source_url} target="_blank" rel="noreferrer" className="link mt-1 inline-block text-xs">
                      Source
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <ActionButton className="btn-sm" action={() => setProofApproval(p.id, productId, !p.approved_for_outreach)}>
                    {p.approved_for_outreach ? "Revoke" : "Approve"}
                  </ActionButton>
                  <ActionButton className="btn-sm btn-danger" confirmText="Delete?" action={() => deleteProof(p.id, productId)}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="space-y-4">
        <Card title="Add proof">
          <div className="space-y-3">
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replace("_", " ")}
                </option>
              ))}
            </select>
            <input className="input" placeholder="Title, e.g. 'Logistics co. cut response time to 3 min'" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="input min-h-[96px]" placeholder="Details, numbers, context, permission to cite…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <select className="input" value={form.source_label} onChange={(e) => setForm({ ...form, source_label: e.target.value as SourceLabel })}>
              {SOURCE_LABELS.filter((s) => s !== "ai-hypothesis").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input className="input" placeholder="Source URL (optional)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            <button
              className="btn btn-primary w-full"
              disabled={pending || !form.title.trim()}
              onClick={() => exec(() => addProof({ productId, ...form }), () => setForm(blank))}
            >
              Add to library
            </button>
            <ErrorText error={error} />
          </div>
        </Card>
        <Card title="Evidence gaps">
          <List items={gaps} empty="Generate the foundation to see which proof you're missing." />
        </Card>
      </div>
    </div>
  );
}
