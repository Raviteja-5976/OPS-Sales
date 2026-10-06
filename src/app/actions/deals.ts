"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext, run, must, audit } from "@/lib/context";
import { loadAccount, loadDeal, loadProductBundle } from "@/lib/loaders";
import { emptyEvidence, normalizeEvidence } from "@/lib/evidence";
import { computeDealHealth } from "@/lib/readiness";
import * as ai from "@/lib/ai/tasks";
import { metered } from "@/lib/billing";
import { DEAL_STAGES, type DealEvidence, type DealStage } from "@/lib/types";

export async function createDeal(_: unknown, formData: FormData) {
  const ctx = await getContext();
  const accountId = String(formData.get("account_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!accountId || !productId) return { ok: false as const, error: "Choose an account and a product." };
  const account = await loadAccount(ctx, accountId);
  const evidence = emptyEvidence();
  if (account.fit_reason) evidence.account_fit = { status: "hypothesis", reason: account.fit_reason };
  const amount = Number(formData.get("amount"));
  const { data, error } = await ctx.supabase
    .from("deals")
    .insert({
      org_id: ctx.org.id,
      account_id: accountId,
      product_id: productId,
      name: String(formData.get("name") ?? "").trim() || `${account.name} opportunity`,
      stage: String(formData.get("stage") ?? "discovery"),
      amount: Number.isFinite(amount) && amount > 0 ? amount : null,
      currency: String(formData.get("currency") ?? "USD"),
      close_date: String(formData.get("close_date") ?? "") || null,
      evidence,
      owner_id: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  await ctx.supabase.from("accounts").update({ status: "engaged" }).eq("id", accountId).eq("status", "target");
  revalidatePath("/deals");
  redirect(`/deals/${data.id}`);
}

export async function updateDealFields(id: string, patch: { name?: string; amount?: number | null; close_date?: string | null; currency?: string }) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("deals").update(patch).eq("id", id));
    revalidatePath(`/deals/${id}`);
  });
}

export async function saveEvidence(id: string, evidence: DealEvidence) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("deals").update({ evidence: normalizeEvidence(evidence) }).eq("id", id));
    await audit(ctx, "deal.evidence_edit", { type: "deal", id });
    revalidatePath(`/deals/${id}`);
    revalidatePath("/deals");
  });
}

/**
 * Soft guardrail: moving forward while the current stage's gate is not "ready" requires a reason,
 * which is logged for coaching. Closing requires an outcome reason.
 */
export async function moveStage(id: string, stage: DealStage, reason?: string) {
  return run(async () => {
    const ctx = await getContext();
    const deal = await loadDeal(ctx, id);
    const order = DEAL_STAGES.map((s) => s.key);
    const forward = order.indexOf(stage) > order.indexOf(deal.stage) && DEAL_STAGES.find((s) => s.key === stage)?.open !== false;
    const health = computeDealHealth(deal, deal.evidence);

    if (["lost", "nurture"].includes(stage) && !reason?.trim()) {
      throw new Error("Record the reason (with evidence) before closing as lost or moving to nurture.");
    }
    if ((forward || stage === "won") && health.status !== "ready" && !reason?.trim()) {
      throw new Error("This stage's exit criteria aren't met. Give a reason to proceed.");
    }
    must(
      await ctx.supabase
        .from("deals")
        .update({ stage, outcome_reason: ["won", "lost", "nurture"].includes(stage) ? reason ?? null : deal.outcome_reason })
        .eq("id", id),
    );
    await audit(
      ctx,
      health.status !== "ready" && (forward || stage === "won") ? "deal.stage_override" : "deal.stage_change",
      { type: "deal", id },
      { from: deal.stage, to: stage, reason, readiness: health.status, failing: health.checks.filter((c) => !c.ok).map((c) => c.key) },
    );
    if (stage === "won") await ctx.supabase.from("accounts").update({ status: "customer" }).eq("id", deal.account_id);
    if (stage === "nurture") await ctx.supabase.from("accounts").update({ status: "nurture" }).eq("id", deal.account_id).neq("status", "customer");
    revalidatePath(`/deals/${id}`);
    revalidatePath("/deals");
  });
}

export async function diagnoseDeal(id: string) {
  return run(async () => {
    const ctx = await getContext();
    const deal = await loadDeal(ctx, id);
    const bundle = await loadProductBundle(ctx, deal.product_id);
    const res = await metered(ctx, "deal_diagnosis", () =>
      ai.dealDiagnosis({
        dealName: deal.name,
        stage: deal.stage,
        amount: deal.amount,
        product: bundle.product,
        foundation: bundle.foundation,
        evidence: deal.evidence,
        health: computeDealHealth(deal, deal.evidence),
      }),
    );
    must(
      await ctx.supabase
        .from("deals")
        .update({ ai_diagnosis: { ...res.data, generated_at: new Date().toISOString() } })
        .eq("id", id),
    );
    await audit(ctx, "ai.deal_diagnosis", { type: "deal", id }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/deals/${id}`);
  });
}

export async function draftProposal(id: string) {
  return run(async () => {
    const ctx = await getContext();
    const deal = await loadDeal(ctx, id);
    const [bundle, account] = await Promise.all([loadProductBundle(ctx, deal.product_id), loadAccount(ctx, deal.account_id)]);
    const res = await metered(ctx, "proposal_draft", () =>
      ai.proposalDraft({
        dealName: deal.name,
        amount: deal.amount,
        currency: deal.currency,
        ...bundle,
        evidence: deal.evidence,
        accountName: account.name,
      }),
    );
    must(await ctx.supabase.from("deals").update({ proposal: res.data }).eq("id", id));
    await audit(ctx, "ai.proposal_draft", { type: "deal", id }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/deals/${id}`);
  });
}

export async function addTask(input: { title: string; dealId?: string; accountId?: string; due?: string; owner?: string; source?: string }) {
  return run(async () => {
    const ctx = await getContext();
    if (!input.title.trim()) throw new Error("Task title is required.");
    must(
      await ctx.supabase.from("tasks").insert({
        org_id: ctx.org.id,
        title: input.title.trim(),
        deal_id: input.dealId ?? null,
        account_id: input.accountId ?? null,
        due_date: input.due || null,
        owner_label: input.owner || null,
        source: input.source ?? "manual",
        created_by: ctx.user.id,
      }),
    );
    if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
    revalidatePath("/today");
  });
}

export async function toggleTask(id: string, done: boolean) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("tasks").update({ done }).eq("id", id));
    revalidatePath("/today");
    revalidatePath("/deals", "layout");
  });
}
