"use client";

import { useActionState, useState, useTransition } from "react";
import { createOrg, acceptInvite } from "@/app/actions/org";
import { ErrorText, Spinner, SubmitButton } from "@/components/actions";

export function OnboardingForms({ email, invites }: { email: string; invites: { id: string; org_name: string; role: string }[] }) {
  const [state, formAction] = useActionState(createOrg, null);
  const [fullName, setFullName] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-6 space-y-6">
      <label className="block">
        <span className="label">Your name</span>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
        <span className="mt-1 block text-xs text-slate-500">Signed in as {email}. Used to sign outreach drafts.</span>
      </label>

      {invites.length > 0 && (
        <div className="card card-pad">
          <h2 className="h-section">You&apos;ve been invited</h2>
          <ul className="mt-3 space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{inv.org_name}</div>
                  <div className="text-xs text-slate-500">as {inv.role}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await acceptInvite(inv.id, fullName);
                      if (res && !res.ok) setInviteError(res.error);
                    })
                  }
                >
                  {pending && <Spinner />} Join
                </button>
              </li>
            ))}
          </ul>
          <ErrorText error={inviteError} />
        </div>
      )}

      <form action={formAction} className="card card-pad space-y-3">
        <h2 className="h-section">{invites.length ? "…or create a new organization" : "Create your organization"}</h2>
        <input type="hidden" name="full_name" value={fullName} />
        <label className="block">
          <span className="label">Company name</span>
          <input className="input" name="name" required placeholder="Acme Consulting" />
        </label>
        <label className="block">
          <span className="label">Website</span>
          <input className="input" name="website" placeholder="https://acme.com" />
        </label>
        <SubmitButton className="btn-primary w-full py-2" pendingText="Creating…">
          Create organization
        </SubmitButton>
        <ErrorText error={state && !state.ok ? state.error : null} />
      </form>
    </div>
  );
}
