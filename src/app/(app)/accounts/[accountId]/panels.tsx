"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Account, AccountBrief, AccountSignal, BuyingRole, Contact } from "@/lib/types";
import { deleteAccount, deleteContact, generateBrief, optOutContact, saveContact, saveSignals, updateAccount } from "@/app/actions/accounts";
import { ActionButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Badge, Card, List, SourceBadge, fmtDate } from "@/components/ui";

const ROLES: BuyingRole[] = ["economic_buyer", "champion", "end_user", "technical_evaluator", "procurement", "influencer", "unknown"];
const BASES = ["unverified", "consent", "legitimate_interest", "existing_relationship"] as const;

export function AccountDetails({ account }: { account: Account }) {
  const [a, setA] = useState(account);
  const { pending, error, exec } = useAction();
  const set = <K extends keyof Account>(k: K, v: Account[K]) => setA({ ...a, [k]: v });
  const dirty = JSON.stringify(a) !== JSON.stringify(account);

  return (
    <Card title="Account details">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={a.status} onChange={(e) => set("status", e.target.value as Account["status"])}>
              {["target", "engaged", "customer", "nurture", "disqualified"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Tier</span>
            <select className="input" value={a.tier} onChange={(e) => set("tier", Number(e.target.value))}>
              {[1, 2, 3].map((t) => (
                <option key={t} value={t}>
                  Tier {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        {a.status === "disqualified" && (
          <label className="block">
            <span className="label">Disqualification reason *</span>
            <input className="input" value={a.disqualify_reason ?? ""} onChange={(e) => set("disqualify_reason", e.target.value)} />
          </label>
        )}
        {(
          [
            ["name", "Name"],
            ["domain", "Domain"],
            ["industry", "Industry"],
            ["employee_count", "Employees"],
            ["geography", "Geography"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="block">
            <span className="label">{l}</span>
            <input className="input" value={(a[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        <label className="block">
          <span className="label">Why it fits the ICP</span>
          <textarea className="input" rows={3} value={a.fit_reason ?? ""} onChange={(e) => set("fit_reason", e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Why now</span>
          <textarea className="input" rows={2} value={a.why_now ?? ""} onChange={(e) => set("why_now", e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Notes</span>
          <textarea className="input" rows={3} value={a.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </label>
        <div className="flex items-center justify-between">
          <button
            className="btn btn-primary"
            disabled={!dirty || pending}
            onClick={() =>
              exec(() =>
                updateAccount(a.id, {
                  name: a.name,
                  domain: a.domain,
                  industry: a.industry,
                  employee_count: a.employee_count,
                  geography: a.geography,
                  tier: a.tier,
                  status: a.status,
                  disqualify_reason: a.disqualify_reason,
                  fit_reason: a.fit_reason,
                  why_now: a.why_now,
                  notes: a.notes,
                }),
              )
            }
          >
            {pending && <Spinner />} Save
          </button>
          <ActionButton className="btn-sm btn-danger" confirmText="Delete account and its data?" action={async () => { await deleteAccount(a.id); return { ok: true }; }}>
            Delete
          </ActionButton>
        </div>
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

export function SignalsEditor({ accountId, signals }: { accountId: string; signals: AccountSignal[] }) {
  const [list, setList] = useState<AccountSignal[]>(signals);
  const [draft, setDraft] = useState<AccountSignal>({ text: "", url: "", date: "" });
  const { pending, error, exec } = useAction();

  function persist(next: AccountSignal[]) {
    setList(next);
    exec(() => saveSignals(accountId, next));
  }

  return (
    <Card title="Public signals">
      <p className="mb-3 text-xs text-slate-500">
        Relevant, public, dated signals (hiring, funding, launches, leadership changes) with a source link. The AI only cites what you add here — it never scrapes or
        guesses.
      </p>
      {list.length > 0 && (
        <ul className="mb-3 space-y-2">
          {list.map((s, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div>{s.text}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                  {s.date && <span>{fmtDate(s.date)}</span>}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="link truncate">
                      {s.url}
                    </a>
                  ) : (
                    <span className="text-amber-600">No source — treated as unverified</span>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm text-slate-400" onClick={() => persist(list.filter((_, j) => j !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_140px_auto]">
        <input className="input" placeholder="Signal, e.g. 'Hiring 3 SDRs in EMEA'" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <input className="input" placeholder="Source URL" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <button
          className="btn"
          disabled={!draft.text.trim() || pending}
          onClick={() => {
            persist([...list, draft]);
            setDraft({ text: "", url: "", date: "" });
          }}
        >
          Add
        </button>
      </div>
      <ErrorText error={error} />
    </Card>
  );
}

const blankContact = (): Partial<Contact> & { name: string } => ({
  name: "",
  title: "",
  email: "",
  phone: "",
  linkedin_url: "",
  buying_role: "unknown",
  jurisdiction: "",
  contact_source: "",
  outreach_basis: "unverified",
});

export function ContactsPanel({ accountId, contacts }: { accountId: string; contacts: Contact[] }) {
  const [editing, setEditing] = useState<(Partial<Contact> & { name: string }) | null>(null);
  const { pending, error, exec } = useAction();

  return (
    <Card title="Contacts & buying committee" actions={<button className="btn btn-sm" onClick={() => setEditing(blankContact())}>Add contact</button>} pad={false}>
      {contacts.length === 0 && !editing && <p className="muted card-pad">No contacts yet. Map the economic buyer, champion and evaluators.</p>}
      {contacts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role in decision</th>
                <th>Outreach basis</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{[c.title, c.email].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td>
                    <Badge tone={c.buying_role === "economic_buyer" ? "blue" : c.buying_role === "champion" ? "green" : "slate"}>{c.buying_role.replace("_", " ")}</Badge>
                  </td>
                  <td>
                    {c.opted_out ? (
                      <Badge tone="red">opted out</Badge>
                    ) : (
                      <Badge tone={c.outreach_basis === "unverified" ? "amber" : "green"}>{c.outreach_basis.replace("_", " ")}</Badge>
                    )}
                    {c.jurisdiction && <div className="mt-0.5 text-xs text-slate-500">{c.jurisdiction}</div>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...c })}>
                      Edit
                    </button>
                    {!c.opted_out && (
                      <ActionButton className="btn-ghost btn-sm" confirmText="Mark opted out?" action={() => optOutContact(c.id)}>
                        Opt out
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Name *"],
                ["title", "Title"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["linkedin_url", "LinkedIn URL"],
                ["jurisdiction", "Jurisdiction (country/state)"],
                ["contact_source", "Where did this contact come from?"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="block">
                <span className="label">{l}</span>
                <input className="input" value={(editing[k] as string) ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
              </label>
            ))}
            <label className="block">
              <span className="label">Role in buying decision</span>
              <select className="input" value={editing.buying_role} onChange={(e) => setEditing({ ...editing, buying_role: e.target.value as BuyingRole })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Outreach basis</span>
              <select
                className="input"
                value={editing.outreach_basis}
                onChange={(e) => setEditing({ ...editing, outreach_basis: e.target.value as Contact["outreach_basis"] })}
              >
                {BASES.map((b) => (
                  <option key={b} value={b}>
                    {b.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button className="btn btn-primary" disabled={pending} onClick={() => exec(() => saveContact(accountId, editing), () => setEditing(null))}>
                {pending && <Spinner />} Save contact
              </button>
              <button className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
            {editing.id && (
              <ActionButton className="btn-sm btn-danger" confirmText="Delete contact?" action={() => deleteContact(editing.id!, accountId)} onDone={() => setEditing(null)}>
                Delete
              </ActionButton>
            )}
          </div>
          <ErrorText error={error} />
        </div>
      )}
    </Card>
  );
}

export function AccountTabsLayout({
  accountId,
  brief,
  products,
  signals,
  contacts,
  outreachSlot,
  dealsSlot,
  callsSlot,
}: {
  accountId: string;
  brief: AccountBrief | null;
  products: { id: string; name: string }[];
  signals: AccountSignal[];
  contacts: Contact[];
  outreachSlot: React.ReactNode;
  dealsSlot: React.ReactNode;
  callsSlot: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"brief" | "contacts" | "activity">("brief");

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("brief")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "brief"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Research & Intelligence</span>
          {brief && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "contacts"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Buying Committee</span>
          <span className={clsx(
            "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
            activeTab === "contacts" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
          )}>
            {contacts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "activity"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>Activity & Pipeline</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "brief" && (
        <div className="space-y-6 animate-rise">
          <div id="brief" className="scroll-mt-6">
            <BriefPanel accountId={accountId} brief={brief} products={products} />
          </div>
          <div id="signals" className="scroll-mt-6">
            <SignalsEditor accountId={accountId} signals={signals} />
          </div>
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="space-y-6 animate-rise">
          <div id="contacts" className="scroll-mt-6">
            <ContactsPanel accountId={accountId} contacts={contacts} />
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6 animate-rise">
          {outreachSlot}
          <div className="grid gap-6 md:grid-cols-2">
            {dealsSlot}
            {callsSlot}
          </div>
        </div>
      )}
    </div>
  );
}

export function BriefPanel({ accountId, brief, products }: { accountId: string; brief: AccountBrief | null; products: { id: string; name: string }[] }) {
  const [productId, setProductId] = useState(brief?.product_id ?? products[0]?.id ?? "");
  return (
    <Card
      title="Research brief"
      actions={
        products.length > 0 && (
          <div className="flex items-center gap-2">
            <select className="input w-44 py-1 text-xs" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ActionButton className="btn-sm btn-primary" action={() => generateBrief(accountId, productId)} pendingText="Researching…">
              {brief ? "Refresh" : "Generate"}
            </ActionButton>
          </div>
        )
      }
    >
      {!products.length ? (
        <p className="muted">Add a product first — the brief is written for selling a specific product.</p>
      ) : !brief ? (
        <p className="muted">
          Generate a brief from the account details, contacts and signals you&apos;ve added: why it fits, operational hypotheses to validate, likely buyer roles,
          relevant approved proof, and a recommended outreach angle.
        </p>
      ) : (
        <div className="space-y-5 text-sm">
          {/* Executive Summary Banner */}
          <div className="rounded-xl border border-gold/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-4">
            <div className="eyebrow mb-1 text-gold-deep">Account Fit Summary</div>
            <p className="text-[14px] leading-relaxed font-medium text-slate-800">{brief.fit_summary}</p>
          </div>

          {/* Disqualification or Risk Warning */}
          {brief.disqualification_risk && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-rose-900">
              <span className="text-base">⚠</span>
              <div className="text-xs leading-relaxed">
                <strong className="font-semibold text-rose-950">Possible Poor Fit / Risk:</strong> {brief.disqualification_risk}
              </div>
            </div>
          )}

          {/* Recommended Outreach Angle */}
          {brief.outreach_angle && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-950">
              <span className="text-base">🎯</span>
              <div className="text-xs leading-relaxed">
                <strong className="font-semibold text-emerald-950">Recommended Angle:</strong> {brief.outreach_angle}
              </div>
            </div>
          )}

          {/* Two-column analysis grid */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Why it fits */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Why it fits
              </div>
              <ul className="space-y-2">
                {brief.fit_reasons.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-xs leading-relaxed text-slate-700">
                    <span>{r.text}</span>
                    <SourceBadge source={r.source} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Hypotheses to validate */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2.5 flex items-center gap-1.5 text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Hypotheses to validate
              </div>
              <ul className="space-y-2">
                {brief.hypotheses.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                    <Badge tone="amber">hypothesis</Badge>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Buyer Roles - Rendered as Structured Persona Cards */}
          <div>
            <div className="eyebrow mb-3 flex items-center gap-1.5 text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Buyer Committee & Key Roles
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {brief.buyer_roles.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{r.role}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Buying Role
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800 font-medium">Why they care:</strong> {r.why}
                  </p>
                  {r.likely_concerns && r.likely_concerns.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Concerns:</span>
                      {r.likely_concerns.map((c, ci) => (
                        <span key={ci} className="rounded-md bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[11px] text-amber-800 font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Relevant Proof & Open Questions Grid */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2.5 text-slate-700">Relevant Approved Proof</div>
              {brief.relevant_proof && brief.relevant_proof.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {brief.relevant_proof.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No approved proof matches.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="eyebrow mb-2.5 text-slate-700">Open Questions For Discovery</div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {brief.open_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gold font-bold">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {brief.generated_at && (
            <div className="pt-2 text-right text-[11px] text-slate-400">
              Brief generated {fmtDate(brief.generated_at, true)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
