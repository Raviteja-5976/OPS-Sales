"use client";

import { useActionState, useState } from "react";
import { createCall } from "@/app/actions/calls";
import { ErrorText, SubmitButton } from "@/components/actions";

export function NewCallForm({
  products,
  accounts,
  contacts,
  deals,
  initialDeal,
  initialAccount,
}: {
  products: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  contacts: { id: string; account_id: string; name: string; title: string | null }[];
  deals: { id: string; name: string; account_id: string; product_id: string }[];
  initialDeal?: string;
  initialAccount?: string;
}) {
  const [state, action] = useActionState(createCall, null);
  const [accountId, setAccountId] = useState(initialAccount ?? "");
  const [dealId, setDealId] = useState(initialDeal ?? "");
  const deal = deals.find((d) => d.id === dealId);

  return (
    <form action={action} className="card card-pad space-y-3">
      <label className="block">
        <span className="label">Account *</span>
        <select
          className="input"
          name="account_id"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setDealId("");
          }}
          required
        >
          <option value="">Select…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Deal (optional — needed to update the evidence record)</span>
        <select className="input" name="deal_id" value={dealId} onChange={(e) => setDealId(e.target.value)}>
          <option value="">No deal yet (e.g. cold call)</option>
          {deals
            .filter((d) => d.account_id === accountId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </label>
      {!deal && (
        <label className="block">
          <span className="label">Product *</span>
          <select className="input" name="product_id" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="label">Who are you speaking with?</span>
        <select className="input" name="contact_id">
          <option value="">—</option>
          {contacts
            .filter((c) => c.account_id === accountId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.title ? ` — ${c.title}` : ""}
              </option>
            ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Type</span>
          <select className="input" name="kind" defaultValue={deal ? "discovery" : "cold_call"}>
            <option value="cold_call">Cold call</option>
            <option value="discovery">Discovery</option>
            <option value="follow_up">Follow-up</option>
            <option value="proposal">Proposal review</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="label">When</span>
          <input className="input" type="datetime-local" name="scheduled_at" />
        </label>
      </div>
      <label className="block">
        <span className="label">Single objective for this call</span>
        <input className="input" name="objective" placeholder="e.g. Quantify how many inbound leads go unanswered after hours" />
      </label>
      <label className="block">
        <span className="label">Title</span>
        <input className="input" name="title" placeholder="Defaults to type — account" />
      </label>
      <SubmitButton className="btn-primary w-full">Create & prepare</SubmitButton>
      <ErrorText error={state && !state.ok ? state.error : null} />
    </form>
  );
}
