"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChecklistItem, ChecklistTemplate } from "@/lib/types";
import { deleteTemplate, saveTemplate } from "@/app/actions/checklists";
import { ActionButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Badge, Card } from "@/components/ui";

export function TemplateEditor({ template, editable }: { template: ChecklistTemplate; editable: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [items, setItems] = useState<ChecklistItem[]>(template.items);
  const { pending, error, exec } = useAction();
  const up = (i: number, p: Partial<ChecklistItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  if (!editable) {
    return (
      <Card>
        <ul className="divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.id} className="py-2 text-sm">
              {i.section && <div className="text-[11px] font-semibold uppercase text-slate-400">{i.section}</div>}
              {i.text} {i.required ? <Badge tone="blue">required</Badge> : <Badge>optional</Badge>}
              {i.why && <div className="text-xs text-slate-500">Why: {i.why}</div>}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
          <label className="block">
            <span className="label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Description</span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      </Card>
      <Card title="Items" actions={<span className="text-xs text-slate-500">Keep required items to evidence that genuinely improves a decision.</span>}>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={it.id || i} className="rounded-md border border-slate-200 p-3">
              <div className="flex gap-2">
                <div className="flex flex-col">
                  <button className="text-xs text-slate-400 hover:text-slate-700" onClick={() => move(i, -1)}>
                    ▲
                  </button>
                  <button className="text-xs text-slate-400 hover:text-slate-700" onClick={() => move(i, 1)}>
                    ▼
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <input className="input" value={it.text} onChange={(e) => up(i, { text: e.target.value })} placeholder="Instruction" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className="input" value={it.section ?? ""} onChange={(e) => up(i, { section: e.target.value || undefined })} placeholder="Section (optional)" />
                    <input className="input sm:col-span-2" value={it.why ?? ""} onChange={(e) => up(i, { why: e.target.value || undefined })} placeholder="Why this matters" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" className="accent-brand-600" checked={it.required} onChange={(e) => up(i, { required: e.target.checked })} /> Required
                    </label>
                    {template.scope === "call" && (
                      <select className="input w-36 py-1 text-xs" value={it.mode ?? ""} onChange={(e) => up(i, { mode: (e.target.value || undefined) as ChecklistItem["mode"] })}>
                        <option value="">All modes</option>
                        <option value="prepare">Prepare</option>
                        <option value="live">Live</option>
                        <option value="review">Review</option>
                      </select>
                    )}
                    <button className="ml-auto text-xs text-red-500 hover:underline" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-sm" onClick={() => setItems([...items, { id: "", text: "", required: false }])}>
            + Add item
          </button>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <ActionButton className="btn-danger" confirmText="Delete this custom checklist?" action={() => deleteTemplate(template.id)} onDone={() => router.push("/playbooks")}>
          Delete
        </ActionButton>
        <button className="btn btn-primary" disabled={pending} onClick={() => exec(() => saveTemplate(template.id, { name, description, items }))}>
          {pending && <Spinner />} Save checklist
        </button>
      </div>
      <ErrorText error={error} />
    </div>
  );
}
