"use client";

import { useState } from "react";
import type { Org, Role } from "@/lib/types";
import { addSuppression, inviteMember, removeMember, removeSuppression, revokeInvite, updateMemberRole, updateOrg } from "@/app/actions/org";
import { ActionButton, ErrorText, Spinner, useAction } from "@/components/actions";
import { Badge, Card, fmtDate } from "@/components/ui";

export function OrgSettingsForm({ org, editable }: { org: Org; editable: boolean }) {
  const s = org.settings ?? {};
  const [v, setV] = useState({
    name: org.name,
    website: org.website ?? "",
    sender_identity: s.sender_identity ?? "",
    inbound_sla_minutes: s.inbound_sla_minutes ?? 5,
    max_touches_per_week: s.max_touches_per_week ?? 3,
    send_window_start: s.send_window_start ?? "08:00",
    send_window_end: s.send_window_end ?? "18:00",
    require_unsubscribe: s.require_unsubscribe ?? true,
    prohibited_phrases: (s.prohibited_phrases ?? []).join("\n"),
  });
  const { pending, error, exec } = useAction();
  const [saved, setSaved] = useState(false);

  return (
    <Card title="Organization & compliance policy">
      <fieldset disabled={!editable} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Organization name</span>
            <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Website</span>
            <input className="input" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Approved sender identity (signature on drafts)</span>
            <input className="input" value={v.sender_identity} onChange={(e) => setV({ ...v, sender_identity: e.target.value })} placeholder="Defaults to each seller's name" />
          </label>
          <label className="block">
            <span className="label">Inbound response SLA (minutes)</span>
            <input className="input" type="number" value={v.inbound_sla_minutes} onChange={(e) => setV({ ...v, inbound_sla_minutes: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="label">Max touches per contact per week</span>
            <input className="input" type="number" value={v.max_touches_per_week} onChange={(e) => setV({ ...v, max_touches_per_week: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="label">Sending window start</span>
            <input className="input" type="time" value={v.send_window_start} onChange={(e) => setV({ ...v, send_window_start: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Sending window end</span>
            <input className="input" type="time" value={v.send_window_end} onChange={(e) => setV({ ...v, send_window_end: e.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-600" checked={v.require_unsubscribe} onChange={(e) => setV({ ...v, require_unsubscribe: e.target.checked })} />
          Require an opt-out line in every outreach email
        </label>
        <label className="block">
          <span className="label">Prohibited phrases (one per line) — block approval when present</span>
          <textarea className="input min-h-[100px]" value={v.prohibited_phrases} onChange={(e) => setV({ ...v, prohibited_phrases: e.target.value })} />
        </label>
        {editable && (
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                exec(
                  () =>
                    updateOrg({
                      name: v.name,
                      website: v.website,
                      settings: {
                        sender_identity: v.sender_identity || undefined,
                        inbound_sla_minutes: v.inbound_sla_minutes,
                        max_touches_per_week: v.max_touches_per_week,
                        send_window_start: v.send_window_start,
                        send_window_end: v.send_window_end,
                        require_unsubscribe: v.require_unsubscribe,
                        prohibited_phrases: v.prohibited_phrases.split("\n").map((x) => x.trim()).filter(Boolean),
                      },
                    }),
                  () => setSaved(true),
                )
              }
            >
              {pending && <Spinner />} Save settings
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          </div>
        )}
        {!editable && <p className="text-xs text-slate-500">Only owners and managers can change these settings.</p>}
        <ErrorText error={error} />
      </fieldset>
    </Card>
  );
}

export function MembersPanel({ members, me, isOwner }: { members: { user_id: string; role: string; email: string | null; full_name: string | null }[]; me: string; isOwner: boolean }) {
  const { error, exec } = useAction();
  return (
    <Card title="Team" pad={false}>
      <ul className="divide-y divide-slate-100">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {m.full_name || m.email} {m.user_id === me && <span className="text-xs text-slate-400">(you)</span>}
              </div>
              <div className="truncate text-xs text-slate-500">{m.email}</div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && m.user_id !== me ? (
                <>
                  <select className="input w-28 py-1 text-xs" value={m.role} onChange={(e) => exec(() => updateMemberRole(m.user_id, e.target.value as Role))}>
                    <option value="owner">owner</option>
                    <option value="manager">manager</option>
                    <option value="rep">rep</option>
                  </select>
                  <ActionButton className="btn-sm btn-ghost text-red-600" confirmText="Remove?" action={() => removeMember(m.user_id)}>
                    Remove
                  </ActionButton>
                </>
              ) : (
                <Badge>{m.role}</Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="px-5 pb-3">
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

export function InvitesPanel({ invites }: { invites: { id: string; email: string; role: string; created_at: string }[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"rep" | "manager">("rep");
  const { pending, error, exec } = useAction();
  return (
    <Card title="Invite teammates">
      <p className="mb-3 text-xs text-slate-500">
        Invitees sign up with this email and join from the onboarding screen. Each person can belong to one organization.
      </p>
      <div className="flex gap-2">
        <input className="input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="input w-32" value={role} onChange={(e) => setRole(e.target.value as "rep" | "manager")}>
          <option value="rep">rep</option>
          <option value="manager">manager</option>
        </select>
        <button className="btn btn-primary" disabled={pending || !email} onClick={() => exec(() => inviteMember(email, role), () => setEmail(""))}>
          Invite
        </button>
      </div>
      <ErrorText error={error} />
      {invites.length > 0 && (
        <ul className="mt-4 space-y-2">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between text-sm">
              <span>
                {i.email} <Badge>{i.role}</Badge> <span className="text-xs text-slate-400">pending since {fmtDate(i.created_at)}</span>
              </span>
              <ActionButton className="btn-sm btn-ghost" action={() => revokeInvite(i.id)}>
                Revoke
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SuppressionPanel({ items, canRemove }: { items: { id: string; value: string; reason: string | null; created_at: string }[]; canRemove: boolean }) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const { pending, error, exec } = useAction();
  return (
    <Card title="Suppression list">
      <p className="mb-3 text-xs text-slate-500">
        Emails or domains that must never be contacted. Opt-outs are added automatically. Suppressed recipients fail the outreach gate.
      </p>
      <div className="flex gap-2">
        <input className="input" placeholder="email@x.com or x.com" value={value} onChange={(e) => setValue(e.target.value)} />
        <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button
          className="btn"
          disabled={pending || !value}
          onClick={() =>
            exec(
              () => addSuppression(value, reason),
              () => {
                setValue("");
                setReason("");
              },
            )
          }
        >
          Add
        </button>
      </div>
      <ErrorText error={error} />
      <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-mono">{s.value}</span> <span className="text-xs text-slate-500">{s.reason}</span>
            </span>
            {canRemove && (
              <ActionButton className="btn-sm btn-ghost" confirmText="Lift suppression?" action={() => removeSuppression(s.id)}>
                Remove
              </ActionButton>
            )}
          </li>
        ))}
        {!items.length && <li className="muted">Empty.</li>}
      </ul>
    </Card>
  );
}
