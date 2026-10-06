"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext, run, must, audit } from "@/lib/context";
import { loadAccount, loadContacts, loadProductBundle } from "@/lib/loaders";
import * as ai from "@/lib/ai/tasks";
import { metered } from "@/lib/billing";
import type { Account, AccountSignal, Contact } from "@/lib/types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export async function createAccount(_: unknown, formData: FormData) {
  const ctx = await getContext();
  const name = str(formData, "name");
  if (!name) return { ok: false as const, error: "Account name is required." };
  const { data, error } = await ctx.supabase
    .from("accounts")
    .insert({
      org_id: ctx.org.id,
      name,
      domain: str(formData, "domain"),
      industry: str(formData, "industry"),
      employee_count: str(formData, "employee_count"),
      geography: str(formData, "geography"),
      tier: Number(formData.get("tier") ?? 2) || 2,
      fit_reason: str(formData, "fit_reason"),
      why_now: str(formData, "why_now"),
      owner_id: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/accounts");
  redirect(`/accounts/${data.id}`);
}

export async function updateAccount(id: string, patch: Partial<Omit<Account, "id" | "org_id" | "created_at">>) {
  return run(async () => {
    const ctx = await getContext();
    if (patch.status === "disqualified" && !patch.disqualify_reason) {
      const current = await loadAccount(ctx, id);
      if (!current.disqualify_reason) throw new Error("Record a disqualification reason.");
    }
    must(await ctx.supabase.from("accounts").update(patch).eq("id", id));
    if (patch.status === "disqualified") {
      // Stop any outreach in flight for a disqualified account.
      await ctx.supabase.from("sequences").update({ status: "stopped" }).eq("account_id", id).in("status", ["draft", "approved", "active"]);
      await audit(ctx, "account.disqualify", { type: "account", id }, { reason: patch.disqualify_reason });
    }
    revalidatePath(`/accounts/${id}`);
    revalidatePath("/accounts");
  });
}

export async function saveSignals(id: string, signals: AccountSignal[]) {
  return updateAccount(id, { signals: signals.filter((s) => s.text.trim()) });
}

export async function deleteAccount(id: string) {
  const ctx = await getContext();
  await ctx.supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function saveContact(accountId: string, contact: Partial<Contact> & { name: string }) {
  return run(async () => {
    const ctx = await getContext();
    if (!contact.name?.trim()) throw new Error("Contact name is required.");
    const row = {
      name: contact.name.trim(),
      title: contact.title || null,
      email: contact.email?.trim().toLowerCase() || null,
      phone: contact.phone || null,
      linkedin_url: contact.linkedin_url || null,
      buying_role: contact.buying_role ?? "unknown",
      jurisdiction: contact.jurisdiction || null,
      contact_source: contact.contact_source || null,
      outreach_basis: contact.outreach_basis ?? "unverified",
    };
    if (contact.id) {
      must(await ctx.supabase.from("contacts").update(row).eq("id", contact.id));
    } else {
      must(await ctx.supabase.from("contacts").insert({ ...row, org_id: ctx.org.id, account_id: accountId }));
    }
    revalidatePath(`/accounts/${accountId}`);
  });
}

export async function deleteContact(id: string, accountId: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("contacts").delete().eq("id", id));
    revalidatePath(`/accounts/${accountId}`);
  });
}

/** Opt-out propagates: contact flag, org suppression list, and any running sequences stop. */
export async function optOutContact(id: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: c } = await ctx.supabase.from("contacts").select("*").eq("id", id).single();
    if (!c) throw new Error("Contact not found.");
    must(await ctx.supabase.from("contacts").update({ opted_out: true }).eq("id", id));
    if (c.email) {
      await ctx.supabase
        .from("suppressions")
        .upsert({ org_id: ctx.org.id, value: c.email.toLowerCase(), reason: "Contact opted out", created_by: ctx.user.id }, { onConflict: "org_id,value" });
    }
    await ctx.supabase.from("sequences").update({ status: "stopped" }).eq("contact_id", id).in("status", ["draft", "approved", "active"]);
    await audit(ctx, "compliance.opt_out", { type: "contact", id }, { email: c.email });
    revalidatePath(`/accounts/${c.account_id}`);
    revalidatePath("/outreach");
  });
}

// ---------------------------------------------------------------------------
// CSV import (baseline integration)
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export async function importAccountsCSV(csv: string) {
  return run(async () => {
    const ctx = await getContext();
    const rows = parseCSV(csv);
    if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row.");
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const col = (r: string[], ...names: string[]) => {
      for (const n of names) {
        const idx = header.indexOf(n);
        if (idx >= 0 && r[idx]?.trim()) return r[idx].trim();
      }
      return null;
    };
    if (!header.some((h) => ["name", "account", "account_name", "company", "company_name"].includes(h))) {
      throw new Error("CSV must include a 'name' (or 'company') column.");
    }

    const { data: existing } = await ctx.supabase.from("accounts").select("id, name, domain");
    const byKey = new Map<string, string>();
    for (const a of existing ?? []) {
      byKey.set(a.name.toLowerCase(), a.id);
      if (a.domain) byKey.set(a.domain.toLowerCase(), a.id);
    }

    let accounts = 0;
    let contacts = 0;
    for (const r of rows.slice(1)) {
      const name = col(r, "name", "account", "account_name", "company", "company_name");
      if (!name) continue;
      const domain = col(r, "domain", "website");
      let id = byKey.get(name.toLowerCase()) ?? (domain ? byKey.get(domain.toLowerCase()) : undefined);
      if (!id) {
        const tier = Number(col(r, "tier")) || 2;
        const created = must(
          await ctx.supabase
            .from("accounts")
            .insert({
              org_id: ctx.org.id,
              name,
              domain,
              industry: col(r, "industry"),
              employee_count: col(r, "employee_count", "employees", "size"),
              geography: col(r, "geography", "country", "region"),
              tier: Math.min(3, Math.max(1, tier)),
              fit_reason: col(r, "fit_reason"),
              owner_id: ctx.user.id,
            })
            .select("id")
            .single(),
        );
        id = created.id as string;
        byKey.set(name.toLowerCase(), id);
        if (domain) byKey.set(domain.toLowerCase(), id);
        accounts++;
      }
      const contactName = col(r, "contact_name", "contact", "full_name");
      if (contactName) {
        const email = col(r, "contact_email", "email")?.toLowerCase() ?? null;
        if (email) {
          const { data: dupe } = await ctx.supabase.from("contacts").select("id").eq("email", email).maybeSingle();
          if (dupe) continue;
        }
        must(
          await ctx.supabase.from("contacts").insert({
            org_id: ctx.org.id,
            account_id: id,
            name: contactName,
            title: col(r, "contact_title", "title"),
            email,
            phone: col(r, "contact_phone", "phone"),
            jurisdiction: col(r, "jurisdiction", "country"),
            contact_source: "CSV import",
          }),
        );
        contacts++;
      }
    }
    await audit(ctx, "import.csv", undefined, { accounts, contacts });
    revalidatePath("/accounts");
    return { accounts, contacts };
  });
}

// ---------------------------------------------------------------------------
// Research brief
// ---------------------------------------------------------------------------

export async function generateBrief(accountId: string, productId: string) {
  return run(async () => {
    const ctx = await getContext();
    const [account, contacts, bundle] = await Promise.all([
      loadAccount(ctx, accountId),
      loadContacts(ctx, accountId),
      loadProductBundle(ctx, productId),
    ]);
    const res = await metered(ctx, "account_brief", () => ai.accountBrief(account, contacts, bundle.product, bundle.foundation, bundle.approved, bundle.proof));
    const brief = { ...res.data, product_id: productId, generated_at: new Date().toISOString() };
    must(await ctx.supabase.from("accounts").update({ research_brief: brief }).eq("id", accountId));
    await audit(ctx, "ai.account_brief", { type: "account", id: accountId }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/accounts/${accountId}`);
  });
}
