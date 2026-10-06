"use client";

import { useActionState } from "react";
import { createDeal } from "@/app/actions/deals";
import { ErrorText, SubmitButton } from "@/components/actions";

export function NewDealForm({
  products,
  accounts,
  initialAccount,
}: {
  products: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  initialAccount?: string;
}) {
  const [state, action] = useActionState(createDeal, null);
  return (
    <form action={action} className="card card-pad space-y-3">
      <label className="block">
        <span className="label">Account *</span>
        <select className="input" name="account_id" defaultValue={initialAccount ?? ""} required>
          <option value="">Select…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
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
      <label className="block">
        <span className="label">Deal name</span>
        <input className="input" name="name" placeholder="Defaults to '<Account> opportunity'" />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 block">
          <span className="label">Amount</span>
          <input className="input" name="amount" type="number" min={0} />
        </label>
        <label className="block">
          <span className="label">Currency</span>
          <select className="input" name="currency" defaultValue="USD">
            {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Stage</span>
          <select className="input" name="stage" defaultValue="discovery">
            <option value="prospecting">Prospecting</option>
            <option value="discovery">Discovery</option>
            <option value="qualified">Qualified</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Target close</span>
          <input className="input" name="close_date" type="date" />
        </label>
      </div>
      <SubmitButton className="btn-primary w-full">Create deal</SubmitButton>
      <ErrorText error={state && !state.ok ? state.error : null} />
    </form>
  );
}
