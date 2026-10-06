"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext, run, must, audit } from "@/lib/context";
import { loadFoundation, loadProduct, loadProof, loadProductBundle } from "@/lib/loaders";
import * as ai from "@/lib/ai/tasks";
import { assertCanAddProduct, metered } from "@/lib/billing";
import { computeFunnel } from "@/lib/funnel";
import type { FoundationContent, ProductIntake, SalesPlanInputs, SourceLabel } from "@/lib/types";

const INTAKE_FIELDS: (keyof ProductIntake)[] = [
  "problem",
  "outcomes",
  "mechanism",
  "ideal_customers",
  "industries",
  "company_size",
  "buyer_roles",
  "exclusions",
  "geography",
  "pricing",
  "delivery_model",
  "capacity",
  "sales_cycle",
  "differentiators",
  "competitors",
  "objections",
  "proof",
  "collateral",
];

function intakeFrom(formData: FormData): ProductIntake {
  const intake: ProductIntake = {};
  for (const f of INTAKE_FIELDS) {
    const v = String(formData.get(f) ?? "").trim();
    if (v) (intake as Record<string, string>)[f] = v;
  }
  return intake;
}

export async function createProduct(_: unknown, formData: FormData) {
  const ctx = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Product name is required." };
  try {
    await assertCanAddProduct(ctx);
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
  const { data, error } = await ctx.supabase
    .from("products")
    .insert({
      org_id: ctx.org.id,
      name,
      one_liner: String(formData.get("one_liner") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      intake: intakeFrom(formData),
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  // Company-provided proof from the intake seeds the proof library (not yet approved for outreach).
  const proofText = String(formData.get("proof") ?? "").trim();
  if (proofText) {
    await ctx.supabase.from("proof_items").insert({
      org_id: ctx.org.id,
      product_id: data.id,
      kind: "other",
      title: "Proof provided during intake",
      body: proofText,
      source_label: "company-provided",
    });
  }
  revalidatePath("/", "layout");
  redirect(`/products/${data.id}?new=1`);
}

export async function updateProduct(_: unknown, formData: FormData) {
  const ctx = await getContext();
  const id = String(formData.get("id"));
  const existing = await loadProduct(ctx, id);
  const { error } = await ctx.supabase
    .from("products")
    .update({
      name: String(formData.get("name") ?? existing.name).trim(),
      one_liner: String(formData.get("one_liner") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      intake: { ...intakeFrom(formData), interview: existing.intake.interview ?? [] },
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/products/${id}`, "layout");
  return { ok: true as const };
}

export async function archiveProduct(id: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("products").update({ status: "archived" }).eq("id", id));
    revalidatePath("/", "layout");
  });
}

// ---------------------------------------------------------------------------
// Foundation
// ---------------------------------------------------------------------------

export async function runInterview(productId: string) {
  return run(async () => {
    const ctx = await getContext();
    const product = await loadProduct(ctx, productId);
    const res = await metered(ctx, "foundation_interview", () => ai.foundationInterview(product));
    const prior = product.intake.interview ?? [];
    const asked = new Set(prior.map((q) => q.question));
    const interview = [
      ...prior,
      ...res.data.questions.filter((q) => q.question && !asked.has(q.question)).map((q) => ({ ...q, answer: "" })),
    ];
    must(await ctx.supabase.from("products").update({ intake: { ...product.intake, interview } }).eq("id", productId));
    await audit(ctx, "ai.foundation_interview", { type: "product", id: productId }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/products/${productId}`, "layout");
    return res.data.questions.length;
  });
}

export async function saveInterviewAnswers(productId: string, answers: { question: string; why?: string; answer: string }[]) {
  return run(async () => {
    const ctx = await getContext();
    const product = await loadProduct(ctx, productId);
    must(await ctx.supabase.from("products").update({ intake: { ...product.intake, interview: answers } }).eq("id", productId));
    revalidatePath(`/products/${productId}`, "layout");
  });
}

/**
 * Generates one foundation section into the working draft. Called once per part by the client,
 * which keeps each request short (well inside hosting timeouts) and shows progress.
 */
export async function generateFoundationPart(productId: string, part: ai.FoundationPart, fresh: boolean) {
  return run(async () => {
    const ctx = await getContext();
    const product = await loadProduct(ctx, productId);
    const proof = await loadProof(ctx, productId);
    const { draft, approved } = await loadFoundation(ctx, productId);

    let draftId = draft?.id;
    let content: FoundationContent = draft?.content ?? {};
    if (fresh || !draft) {
      // A new generation starts a new draft version; the approved version stays live until replaced.
      const { data: last } = await ctx.supabase
        .from("foundations")
        .select("version")
        .eq("product_id", productId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (draft) must(await ctx.supabase.from("foundations").update({ status: "archived" }).eq("id", draft.id));
      const created = must(
        await ctx.supabase
          .from("foundations")
          .insert({
            org_id: ctx.org.id,
            product_id: productId,
            version: (last?.version ?? 0) + 1,
            status: "draft",
            content: {},
            created_by: ctx.user.id,
          })
          .select("id")
          .single(),
      );
      draftId = created.id;
      content = {};
    }

    const prior = Object.keys(content).length ? content : approved?.content ?? {};
    const res = await metered(ctx, "foundation_part", () => ai.foundationPart(part, product, proof, prior));
    content = { ...content, [part]: res.data };
    must(await ctx.supabase.from("foundations").update({ content }).eq("id", draftId!));
    await audit(ctx, "ai.foundation_generate", { type: "foundation", id: draftId! }, { part, model: res.model, tokens: res.tokens });
    revalidatePath(`/products/${productId}`, "layout");
  });
}

export async function saveFoundationContent(foundationId: string, content: FoundationContent) {
  return run(async () => {
    const ctx = await getContext();
    const { data: f } = await ctx.supabase.from("foundations").select("status, product_id").eq("id", foundationId).single();
    if (!f) throw new Error("Foundation not found.");
    if (f.status !== "draft") throw new Error("Only drafts can be edited. Start a new version to make changes.");
    must(await ctx.supabase.from("foundations").update({ content }).eq("id", foundationId));
    await audit(ctx, "foundation.edit", { type: "foundation", id: foundationId });
    revalidatePath(`/products/${f.product_id}`, "layout");
  });
}

/** Copy the approved version into a new editable draft. */
export async function newFoundationDraft(productId: string) {
  return run(async () => {
    const ctx = await getContext();
    const { approved, draft } = await loadFoundation(ctx, productId);
    if (draft) return draft.id;
    if (!approved) throw new Error("Nothing to copy yet. Generate a foundation first.");
    const created = must(
      await ctx.supabase
        .from("foundations")
        .insert({
          org_id: ctx.org.id,
          product_id: productId,
          version: approved.version + 1,
          status: "draft",
          content: approved.content,
          created_by: ctx.user.id,
        })
        .select("id")
        .single(),
    );
    revalidatePath(`/products/${productId}`, "layout");
    return created.id as string;
  });
}

export async function approveFoundation(foundationId: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: f } = await ctx.supabase.from("foundations").select("*").eq("id", foundationId).single();
    if (!f) throw new Error("Foundation not found.");
    const parts = Object.keys(f.content ?? {});
    if (parts.length < 4) throw new Error("Generate all four sections before approving.");
    must(
      await ctx.supabase
        .from("foundations")
        .update({ status: "archived" })
        .eq("product_id", f.product_id)
        .eq("status", "approved"),
    );
    must(
      await ctx.supabase
        .from("foundations")
        .update({ status: "approved", approved_by: ctx.user.id, approved_at: new Date().toISOString() })
        .eq("id", foundationId),
    );
    must(await ctx.supabase.from("products").update({ status: "active" }).eq("id", f.product_id));
    await audit(ctx, "foundation.approve", { type: "foundation", id: foundationId }, { version: f.version });
    revalidatePath("/", "layout");
  });
}

// ---------------------------------------------------------------------------
// Proof library
// ---------------------------------------------------------------------------

export async function addProof(input: {
  productId: string;
  kind: string;
  title: string;
  body: string;
  source_label: SourceLabel;
  source_url: string;
}) {
  return run(async () => {
    const ctx = await getContext();
    if (!input.title.trim()) throw new Error("Title is required.");
    must(
      await ctx.supabase.from("proof_items").insert({
        org_id: ctx.org.id,
        product_id: input.productId,
        kind: input.kind,
        title: input.title.trim(),
        body: input.body.trim() || null,
        source_label: input.source_label,
        source_url: input.source_url.trim() || null,
      }),
    );
    revalidatePath(`/products/${input.productId}/proof`);
  });
}

export async function setProofApproval(id: string, productId: string, approved: boolean) {
  return run(async () => {
    const ctx = await getContext();
    const { data: p } = await ctx.supabase.from("proof_items").select("source_label").eq("id", id).single();
    if (approved && p?.source_label === "ai-hypothesis") {
      throw new Error("AI hypotheses can't be approved as proof. Replace with a verified source first.");
    }
    must(await ctx.supabase.from("proof_items").update({ approved_for_outreach: approved }).eq("id", id));
    await audit(ctx, approved ? "proof.approve" : "proof.unapprove", { type: "proof_item", id });
    revalidatePath(`/products/${productId}/proof`);
  });
}

export async function deleteProof(id: string, productId: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("proof_items").delete().eq("id", id));
    revalidatePath(`/products/${productId}/proof`);
  });
}

// ---------------------------------------------------------------------------
// Sales Plan Studio
// ---------------------------------------------------------------------------

export async function savePlan(productId: string, planId: string | null, name: string, inputs: SalesPlanInputs) {
  return run(async () => {
    const ctx = await getContext();
    if (planId) {
      must(await ctx.supabase.from("sales_plans").update({ name, inputs }).eq("id", planId));
      revalidatePath(`/products/${productId}/plan`);
      return planId;
    }
    const created = must(
      await ctx.supabase
        .from("sales_plans")
        .insert({ org_id: ctx.org.id, product_id: productId, name, inputs, created_by: ctx.user.id })
        .select("id")
        .single(),
    );
    revalidatePath(`/products/${productId}/plan`);
    return created.id as string;
  });
}

export async function generatePlan(planId: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: plan } = await ctx.supabase.from("sales_plans").select("*").eq("id", planId).single();
    if (!plan) throw new Error("Plan not found.");
    const bundle = await loadProductBundle(ctx, plan.product_id);
    const inputs = plan.inputs as SalesPlanInputs;
    const res = await metered(ctx, "sales_plan", () => ai.salesPlan(bundle.product, bundle.foundation, bundle.approved, inputs, computeFunnel(inputs)));
    must(await ctx.supabase.from("sales_plans").update({ plan: res.data }).eq("id", planId));
    await audit(ctx, "ai.sales_plan", { type: "sales_plan", id: planId }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/products/${plan.product_id}/plan`);
  });
}

export async function deletePlan(planId: string, productId: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("sales_plans").delete().eq("id", planId));
    revalidatePath(`/products/${productId}/plan`);
  });
}
