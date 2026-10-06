import "server-only";
import { notFound } from "next/navigation";
import type { Ctx } from "./context";
import { normalizeEvidence } from "./evidence";
import type {
  Account,
  ChecklistRun,
  ChecklistTemplate,
  Contact,
  Deal,
  Foundation,
  Product,
  ProofItem,
} from "./types";

export async function loadProducts(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("products")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: true });
  return (data ?? []) as Product[];
}

export async function loadProduct(ctx: Ctx, id: string) {
  const { data } = await ctx.supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as Product;
}

/** Latest approved foundation, else the latest draft. */
export async function loadFoundation(ctx: Ctx, productId: string) {
  const { data } = await ctx.supabase
    .from("foundations")
    .select("*")
    .eq("product_id", productId)
    .neq("status", "archived")
    .order("version", { ascending: false });
  const list = (data ?? []) as Foundation[];
  const approved = list.find((f) => f.status === "approved") ?? null;
  const draft = list.find((f) => f.status === "draft") ?? null;
  return { approved, draft, current: approved ?? draft };
}

export async function loadProof(ctx: Ctx, productId: string, onlyApproved = false) {
  let q = ctx.supabase
    .from("proof_items")
    .select("*")
    .or(`product_id.eq.${productId},product_id.is.null`)
    .order("created_at", { ascending: true });
  if (onlyApproved) q = q.eq("approved_for_outreach", true);
  const { data } = await q;
  return (data ?? []) as ProofItem[];
}

/** Everything the AI needs about a product, in one call. */
export async function loadProductBundle(ctx: Ctx, productId: string) {
  const [product, f, proof] = await Promise.all([
    loadProduct(ctx, productId),
    loadFoundation(ctx, productId),
    loadProof(ctx, productId, true),
  ]);
  return {
    product,
    foundation: f.current?.content ?? null,
    approved: !!f.approved,
    proof,
  };
}

export async function loadAccount(ctx: Ctx, id: string) {
  const { data } = await ctx.supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as Account;
}

export async function loadContacts(ctx: Ctx, accountId: string) {
  const { data } = await ctx.supabase.from("contacts").select("*").eq("account_id", accountId).order("created_at");
  return (data ?? []) as Contact[];
}

export async function loadDeal(ctx: Ctx, id: string) {
  const { data } = await ctx.supabase.from("deals").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as Deal;
  return { ...d, evidence: normalizeEvidence(d.evidence) };
}

export async function loadChecklist(ctx: Ctx, key: string, entityType: string, entityId: string) {
  const { data: tpl } = await ctx.supabase
    .from("checklist_templates")
    .select("*")
    .eq("key", key)
    .order("built_in", { ascending: true }) // prefer an org's customized clone over the built-in copy
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tpl) return null;
  const { data: run } = await ctx.supabase
    .from("checklist_runs")
    .select("*")
    .eq("template_id", tpl.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  return { template: tpl as ChecklistTemplate, run: (run as ChecklistRun | null) ?? null };
}

export async function loadMembers(ctx: Ctx) {
  const { data } = await ctx.supabase.from("org_members").select("user_id, role, email, full_name").order("created_at");
  return (data ?? []) as { user_id: string; role: string; email: string | null; full_name: string | null }[];
}
