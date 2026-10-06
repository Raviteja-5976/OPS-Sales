"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext, run, must, audit, type Ctx } from "@/lib/context";
import { loadAccount, loadDeal, loadProductBundle } from "@/lib/loaders";
import { mergeEvidence, normalizeEvidence } from "@/lib/evidence";
import * as ai from "@/lib/ai/tasks";
import { metered } from "@/lib/billing";
import type { Call, CallReview, Contact, LiveNote } from "@/lib/types";

async function loadCall(ctx: Ctx, id: string) {
  const { data } = await ctx.supabase.from("calls").select("*").eq("id", id).single();
  if (!data) throw new Error("Call not found.");
  return data as Call;
}

export async function createCall(_: unknown, formData: FormData) {
  const ctx = await getContext();
  const dealId = String(formData.get("deal_id") ?? "") || null;
  let accountId = String(formData.get("account_id") ?? "");
  let productId = String(formData.get("product_id") ?? "");
  if (dealId) {
    const deal = await loadDeal(ctx, dealId);
    accountId = deal.account_id;
    productId = deal.product_id;
  }
  if (!accountId || !productId) return { ok: false as const, error: "Choose an account and product (or a deal)." };
  const account = await loadAccount(ctx, accountId);
  const kind = String(formData.get("kind") ?? "discovery");
  const scheduled = String(formData.get("scheduled_at") ?? "");
  const { data, error } = await ctx.supabase
    .from("calls")
    .insert({
      org_id: ctx.org.id,
      deal_id: dealId,
      account_id: accountId,
      product_id: productId,
      contact_id: String(formData.get("contact_id") ?? "") || null,
      title: String(formData.get("title") ?? "").trim() || `${kind.replace("_", " ")} — ${account.name}`,
      kind,
      scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      objective: String(formData.get("objective") ?? "").trim() || null,
      owner_id: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/calls");
  redirect(`/calls/${data.id}`);
}

export async function generatePrep(callId: string) {
  return run(async () => {
    const ctx = await getContext();
    const call = await loadCall(ctx, callId);
    const [bundle, account, contactRes, deal, prevRes] = await Promise.all([
      loadProductBundle(ctx, call.product_id),
      loadAccount(ctx, call.account_id),
      call.contact_id ? ctx.supabase.from("contacts").select("*").eq("id", call.contact_id).maybeSingle() : Promise.resolve({ data: null }),
      call.deal_id ? loadDeal(ctx, call.deal_id) : Promise.resolve(null),
      ctx.supabase
        .from("calls")
        .select("title, completed_at, review")
        .eq("account_id", call.account_id)
        .eq("status", "completed")
        .neq("id", callId)
        .order("completed_at", { ascending: false })
        .limit(5),
    ]);
    const res = await metered(ctx, "call_prep", () =>
      ai.callPrep({
        callKind: call.kind,
        objective: call.objective,
        ...bundle,
        account,
        contact: (contactRes.data as Contact) ?? null,
        evidence: deal?.evidence ?? null,
        previous: (prevRes.data ?? []).map((p) => ({
          title: p.title,
          date: p.completed_at ?? "",
          summary: (p.review as CallReview | null)?.summary ?? "",
        })),
      }),
    );
    must(await ctx.supabase.from("calls").update({ prep_brief: res.data }).eq("id", callId));
    await audit(ctx, "ai.call_prep", { type: "call", id: callId }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/calls/${callId}`);
  });
}

export async function updateCall(callId: string, patch: Partial<Pick<Call, "status" | "notes" | "transcript" | "objective" | "consent_to_record" | "current_stage" | "live_notes" | "contact_id">>) {
  return run(async () => {
    const ctx = await getContext();
    const extra: Record<string, unknown> = {};
    if (patch.status === "completed") extra.completed_at = new Date().toISOString();
    must(await ctx.supabase.from("calls").update({ ...patch, ...extra }).eq("id", callId));
    if (patch.status) {
      await audit(ctx, `call.${patch.status}`, { type: "call", id: callId });
      revalidatePath(`/calls/${callId}`);
      revalidatePath("/calls");
    }
  });
}

export async function nextQuestion(callId: string, stage: number, notes: LiveNote[]) {
  return run(async () => {
    const ctx = await getContext();
    const call = await loadCall(ctx, callId);
    const [deal, { data: product }] = await Promise.all([
      call.deal_id ? loadDeal(ctx, call.deal_id) : Promise.resolve(null),
      ctx.supabase.from("products").select("name").eq("id", call.product_id).single(),
    ]);
    const res = await metered(ctx, "live_next_question", () => ai.liveNextQuestion({ stage, evidence: deal?.evidence ?? null, notes, productName: product?.name ?? "" }));
    return res.data;
  });
}

export async function diagnoseObjection(callId: string, objection: string, stage: number) {
  return run(async () => {
    const ctx = await getContext();
    const call = await loadCall(ctx, callId);
    const [deal, { data: product }] = await Promise.all([
      call.deal_id ? loadDeal(ctx, call.deal_id) : Promise.resolve(null),
      ctx.supabase.from("products").select("name").eq("id", call.product_id).single(),
    ]);
    const res = await metered(ctx, "objection_diagnosis", () => ai.objectionDiagnosis({ objection, stage, evidence: deal?.evidence ?? null, productName: product?.name ?? "" }));
    await audit(ctx, "ai.objection_diagnosis", { type: "call", id: callId }, { objection });
    return res.data;
  });
}

export async function reviewCall(callId: string) {
  return run(async () => {
    const ctx = await getContext();
    const call = await loadCall(ctx, callId);
    if (!call.notes?.trim() && !call.transcript?.trim() && !call.live_notes.length) {
      throw new Error("Add notes or a transcript first.");
    }
    const [deal, account, { data: product }, contactRes] = await Promise.all([
      call.deal_id ? loadDeal(ctx, call.deal_id) : Promise.resolve(null),
      loadAccount(ctx, call.account_id),
      ctx.supabase.from("products").select("name").eq("id", call.product_id).single(),
      call.contact_id ? ctx.supabase.from("contacts").select("name").eq("id", call.contact_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const res = await metered(ctx, "call_review", () =>
      ai.callReview({
        productName: product?.name ?? "",
        accountName: account.name,
        contactName: contactRes.data?.name ?? null,
        sellerName: ctx.displayName,
        notes: call.notes ?? "",
        transcript: call.transcript ?? "",
        liveNotes: call.live_notes,
        evidence: deal?.evidence ?? null,
      }),
    );
    must(
      await ctx.supabase
        .from("calls")
        .update({ review: { ...res.data, generated_at: new Date().toISOString() }, status: "completed", completed_at: call.completed_at ?? new Date().toISOString() })
        .eq("id", callId),
    );
    await audit(ctx, "ai.call_review", { type: "call", id: callId }, { model: res.model, tokens: res.tokens });
    revalidatePath(`/calls/${callId}`);
  });
}

/** Seller-confirmed application of an AI review to the deal record. Nothing is applied silently. */
export async function applyReview(callId: string, opts: { evidence: boolean; nextStep: boolean; tasks: boolean; objections: boolean }) {
  return run(async () => {
    const ctx = await getContext();
    const call = await loadCall(ctx, callId);
    if (!call.review) throw new Error("Run the AI review first.");
    if (!call.deal_id) throw new Error("Link this call to a deal to update evidence.");
    const deal = await loadDeal(ctx, call.deal_id);
    const r = call.review;
    let evidence = deal.evidence;
    if (opts.evidence) evidence = mergeEvidence(evidence, r.evidence_updates);
    if (opts.nextStep && (r.next_step.owner || r.next_step.date || r.next_step.purpose)) {
      evidence = { ...evidence, next_step: { ...evidence.next_step, ...Object.fromEntries(Object.entries(r.next_step).filter(([, v]) => v)) } };
    }
    if (opts.objections && r.objections.length) {
      evidence = mergeEvidence(evidence, {
        objections: r.objections.map((o) => ({
          text: o.text,
          category: "call",
          origin_stage: o.origin_stage,
          missing_belief: (o.missing_belief as never) ?? "",
          status: "open" as const,
          at: new Date().toISOString(),
        })),
      });
    }
    if (opts.tasks) {
      evidence = mergeEvidence(evidence, { commitments: r.commitments });
      if (r.commitments.length) {
        await ctx.supabase.from("tasks").insert(
          r.commitments.map((c) => ({
            org_id: ctx.org.id,
            deal_id: deal.id,
            account_id: deal.account_id,
            title: c.text,
            owner_label: c.owner,
            due_date: c.due && /^\d{4}-\d{2}-\d{2}$/.test(c.due) ? c.due : null,
            source: "call",
            created_by: ctx.user.id,
          })),
        );
      }
    }
    evidence = {
      ...evidence,
      evidence_sources: [...evidence.evidence_sources, { kind: "call", ref: callId, date: new Date().toISOString().slice(0, 10) }],
    };
    must(await ctx.supabase.from("deals").update({ evidence: normalizeEvidence(evidence) }).eq("id", deal.id));
    await audit(ctx, "deal.apply_call_review", { type: "deal", id: deal.id }, { call: callId, ...opts });
    revalidatePath(`/calls/${callId}`);
    revalidatePath(`/deals/${deal.id}`);
    revalidatePath("/today");
  });
}

export async function linkCallToDeal(callId: string, dealId: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("calls").update({ deal_id: dealId }).eq("id", callId));
    revalidatePath(`/calls/${callId}`);
  });
}

export async function deleteCall(callId: string) {
  const ctx = await getContext();
  await ctx.supabase.from("calls").delete().eq("id", callId);
  revalidatePath("/calls");
  redirect("/calls");
}
