"use client";

import { useActionState, useState } from "react";
import { createAccount, importAccountsCSV } from "@/app/actions/accounts";
import { ErrorText, SubmitButton, useAction } from "@/components/actions";

export function AccountCreate({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState<"new" | "csv" | null>(initialOpen ? "new" : null);
  const [state, action] = useActionState(createAccount, null);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const imp = useAction();

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button className="btn" onClick={() => setOpen(open === "csv" ? null : "csv")}>
          Import CSV
        </button>
        <button className="btn btn-primary" onClick={() => setOpen(open === "new" ? null : "new")}>
          New account
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[#241812]/40 p-4 pt-20" onClick={() => setOpen(null)}>
          <div className="floating card-pad w-full max-w-lg animate-rise" onClick={(e) => e.stopPropagation()}>
            {open === "new" ? (
              <form action={action} className="space-y-3">
                <h2 className="h-section">New target account</h2>
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 block">
                    <span className="label">Company name *</span>
                    <input className="input" name="name" required />
                  </label>
                  <label className="block">
                    <span className="label">Domain</span>
                    <input className="input" name="domain" placeholder="acme.com" />
                  </label>
                  <label className="block">
                    <span className="label">Industry</span>
                    <input className="input" name="industry" />
                  </label>
                  <label className="block">
                    <span className="label">Employees</span>
                    <input className="input" name="employee_count" placeholder="50–200" />
                  </label>
                  <label className="block">
                    <span className="label">Tier</span>
                    <select className="input" name="tier" defaultValue="2">
                      <option value="1">Tier 1 — deep research</option>
                      <option value="2">Tier 2 — light research</option>
                      <option value="3">Tier 3 — role-based</option>
                    </select>
                  </label>
                  <label className="col-span-2 block">
                    <span className="label">Geography</span>
                    <input className="input" name="geography" />
                  </label>
                  <label className="col-span-2 block">
                    <span className="label">Why it fits the ICP</span>
                    <textarea className="input" name="fit_reason" rows={2} />
                  </label>
                  <label className="col-span-2 block">
                    <span className="label">Why now (observable trigger)</span>
                    <textarea className="input" name="why_now" rows={2} />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn" onClick={() => setOpen(null)}>
                    Cancel
                  </button>
                  <SubmitButton className="btn-primary">Create account</SubmitButton>
                </div>
                <ErrorText error={state && !state.ok ? state.error : null} />
              </form>
            ) : (
              <div className="space-y-3">
                <h2 className="h-section">Import accounts & contacts from CSV</h2>
                <p className="text-xs text-slate-500">
                  Header row required. Recognized columns: <code>name</code> (or company), domain, industry, employee_count, geography, tier,
                  fit_reason, contact_name, contact_title, contact_email, contact_phone, jurisdiction. Existing accounts are matched by name or domain;
                  contacts are de-duplicated by email.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="text-sm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsv(await file.text());
                  }}
                />
                <textarea className="input min-h-[140px] font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="name,domain,industry,contact_name,contact_email" />
                <div className="flex items-center justify-end gap-2">
                  {result && <span className="text-sm text-emerald-600">{result}</span>}
                  <button
                    className="btn btn-primary"
                    disabled={imp.pending || !csv.trim()}
                    onClick={() =>
                      imp.exec(
                        () => importAccountsCSV(csv),
                        (d) => {
                          setResult(`Imported ${d?.accounts ?? 0} accounts, ${d?.contacts ?? 0} contacts.`);
                          setCsv("");
                        },
                      )
                    }
                  >
                    Import
                  </button>
                </div>
                <ErrorText error={imp.error} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
