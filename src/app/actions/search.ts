"use server";

import { getContext } from "@/lib/context";

export type SearchHit = { kind: "account" | "deal" | "contact" | "call" | "product" | "playbook"; id: string; title: string; subtitle: string; href: string };

/** Command-palette search across the org. RLS scopes every query to the caller's org. */
export async function searchAll(q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const ctx = await getContext();
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const [accounts, deals, contacts, calls, products, playbooks] = await Promise.all([
    ctx.supabase.from("accounts").select("id, name, industry, status").ilike("name", like).limit(5),
    ctx.supabase.from("deals").select("id, name, stage").ilike("name", like).limit(5),
    ctx.supabase.from("contacts").select("id, name, title, account_id").ilike("name", like).limit(5),
    ctx.supabase.from("calls").select("id, title, status").ilike("title", like).limit(4),
    ctx.supabase.from("products").select("id, name").ilike("name", like).neq("status", "archived").limit(4),
    ctx.supabase.from("checklist_templates").select("id, name").ilike("name", like).limit(4),
  ]);
  return [
    ...(accounts.data ?? []).map((a) => ({ kind: "account" as const, id: a.id, title: a.name, subtitle: [a.industry, a.status].filter(Boolean).join(" · "), href: `/accounts/${a.id}` })),
    ...(deals.data ?? []).map((d) => ({ kind: "deal" as const, id: d.id, title: d.name, subtitle: `Opportunity · ${d.stage}`, href: `/deals/${d.id}` })),
    ...(contacts.data ?? []).map((c) => ({ kind: "contact" as const, id: c.id, title: c.name, subtitle: c.title ?? "Contact", href: `/accounts/${c.account_id}` })),
    ...(calls.data ?? []).map((c) => ({ kind: "call" as const, id: c.id, title: c.title, subtitle: `Call · ${c.status}`, href: `/calls/${c.id}` })),
    ...(products.data ?? []).map((p) => ({ kind: "product" as const, id: p.id, title: p.name, subtitle: "Product foundation", href: `/products/${p.id}` })),
    ...(playbooks.data ?? []).map((p) => ({ kind: "playbook" as const, id: p.id, title: p.name, subtitle: "Playbook", href: `/playbooks/${p.id}` })),
  ];
}
