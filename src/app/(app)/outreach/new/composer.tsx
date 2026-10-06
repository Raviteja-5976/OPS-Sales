"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Account, Contact, Sequence } from "@/lib/types";
import { generateSequence } from "@/app/actions/outreach";
import { ErrorText, Spinner } from "@/components/actions";
import { Card } from "@/components/ui";

const OBJECTIVES: { key: Sequence["objective"]; label: string; hint: string }[] = [
  { key: "permission", label: "Permission", hint: "Ask if a short conversation is welcome" },
  { key: "relevance", label: "Relevance", hint: "Test whether a problem hypothesis resonates" },
  { key: "meeting", label: "Meeting", hint: "Book a discovery conversation" },
  { key: "re-engagement", label: "Re-engagement", hint: "Restart a stalled conversation honestly" },
];
const CHANNELS = ["email", "phone", "linkedin", "voicemail"];

export function Composer({
  products,
  accounts,
  contacts,
  initialAccount,
  initialContact,
}: {
  products: { id: string; name: string; approved: boolean }[];
  accounts: Pick<Account, "id" | "name" | "research_brief">[];
  contacts: Pick<Contact, "id" | "account_id" | "name" | "title" | "opted_out" | "outreach_basis" | "email">[];
  initialAccount?: string;
  initialContact?: string;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(initialAccount ?? "");
  const acctContacts = useMemo(() => contacts.filter((c) => c.account_id === accountId), [contacts, accountId]);
  const [contactId, setContactId] = useState(initialContact ?? "");
  const account = accounts.find((a) => a.id === accountId);
  const [productId, setProductId] = useState(account?.research_brief?.product_id ?? products[0]?.id ?? "");
  const [objective, setObjective] = useState<Sequence["objective"]>("meeting");
  const [angle, setAngle] = useState("");
  const [channels, setChannels] = useState<string[]>(["email", "phone", "linkedin"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contact = contacts.find((c) => c.id === contactId);
  const product = products.find((p) => p.id === productId);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await generateSequence({ accountId, contactId, productId, objective, angle, channels });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/outreach/${res.data}`);
  }

  return (
    <div className="space-y-5">
      <Card title="1 · Who">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Account</span>
            <select
              className="input"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setContactId("");
              }}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Contact</span>
            <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!accountId}>
              <option value="">Select contact…</option>
              {acctContacts.map((c) => (
                <option key={c.id} value={c.id} disabled={c.opted_out}>
                  {c.name}
                  {c.title ? ` — ${c.title}` : ""}
                  {c.opted_out ? " (opted out)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {accountId && acctContacts.length === 0 && (
          <p className="mt-2 text-sm text-amber-700">
            No contacts on this account.{" "}
            <Link className="link" href={`/accounts/${accountId}`}>
              Add one
            </Link>
            .
          </p>
        )}
        {contact?.outreach_basis === "unverified" && (
          <p className="mt-2 text-sm text-amber-700">This contact&apos;s outreach basis is unverified. You can draft, but record a basis before approval.</p>
        )}
        {account && !account.research_brief && (
          <p className="mt-2 text-xs text-slate-500">
            Tip: generate a research brief on the{" "}
            <Link className="link" href={`/accounts/${accountId}`}>
              account page
            </Link>{" "}
            first for a sharper angle.
          </p>
        )}
      </Card>

      <Card title="2 · What">
        <div className="space-y-4">
          <label className="block">
            <span className="label">Product</span>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.approved ? "" : " (foundation not approved)"}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="label">Objective</span>
            <div className="grid gap-2 sm:grid-cols-4">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setObjective(o.key)}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-left",
                    objective === o.key ? "border-brand-600 bg-surface-warm ring-2 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="text-sm font-medium">{o.label}</div>
                  <div className="text-[11px] text-slate-500">{o.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Angle (optional)</span>
            <input
              className="input"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder={account?.research_brief?.outreach_angle || "One problem/outcome relevant to this person"}
            />
          </label>
          <div>
            <span className="label">Channels</span>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm capitalize">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={channels.includes(c)}
                    onChange={(e) => setChannels(e.target.checked ? [...channels, c] : channels.filter((x) => x !== c))}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {product && !product.approved && "This product's foundation isn't approved — the draft will be flagged. "}
          Drafts are checked for suppression, opt-out language, unverified claims, pressure tactics and deceptive familiarity.
        </p>
        <button className="btn btn-primary shrink-0" disabled={busy || !accountId || !contactId || !productId} onClick={submit}>
          {busy && <Spinner />} {busy ? "Drafting & checking…" : "Draft sequence"}
        </button>
      </div>
      <ErrorText error={error} />
    </div>
  );
}
