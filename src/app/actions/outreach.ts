"use server";

import { revalidatePath } from "next/cache";
import { getContext, run, must, audit, type Ctx } from "@/lib/context";
import { loadAccount, loadProductBundle } from "@/lib/loaders";
import { runComplianceChecks, blockingFailures } from "@/lib/compliance";
import * as ai from "@/lib/ai/tasks";
import { metered } from "@/lib/billing";
import type { CheckResult, Contact, ProofItem, Sequence, SequenceContent } from "@/lib/types";

async function deterministicChecks(ctx: Ctx, seq: { id?: string; contact_id: string | null; content: SequenceContent }, proof: ProofItem[]) {
  const [{ data: contact }, { data: sup }, { count }] = await Promise.all([
    seq.contact_id
      ? ctx.supabase.from("contacts").select("*").eq("id", seq.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ctx.supabase.from("suppressions").select("value"),
    seq.contact_id
      ? ctx.supabase
          .from("sequences")
          .select("id", { count: "exact", head: true })
          .eq("contact_id", seq.contact_id)
          .in("status", ["approved", "active"])
          .neq("id", seq.id ?? "00000000-0000-0000-0000-000000000000")
      : Promise.resolve({ count: 0 }),
  ]);
  return runComplianceChecks({
    content: seq.content,
    contact: (contact as Contact) ?? null,
    suppressions: (sup ?? []).map((s) => s.value as string),
    settings: ctx.org.settings ?? {},
    approvedProof: proof,
    otherActiveSequences: count ?? 0,
  });
}

const AI_NOT_RUN: CheckResult = {
  key: "ai_pending",
  label: "AI quality review",
  status: "warn",
  detail: "Not run yet. Run it to check tone, relevance, unsupported claims and personalization.",
};

function aiChecks(review: Awaited<ReturnType<typeof ai.outreachReview>>["data"]): CheckResult[] {
  const issues = review.issues
    .filter((i) => i.issue)
    .map((i, idx) => ({
      key: `ai_${idx}`,
      label: `AI review: ${i.area || "quality"}`,
      status: i.severity,
      detail: `${i.issue}${i.fix ? ` — Fix: ${i.fix}` : ""}`,
    }));
  return issues.length
    ? issues
    : [{ key: "ai_ok", label: "AI quality review", status: "pass", detail: review.overall || "No issues found." }];
}

/** Run the AI quality review on the current draft and replace previous AI findings. */
export async function runAIReview(id: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: seq } = await ctx.supabase.from("sequences").select("*").eq("id", id).single();
    if (!seq) throw new Error("Sequence not found.");
    const bundle = await loadProductBundle(ctx, seq.product_id);
    const review = await metered(ctx, "outreach_review", () => ai.outreachReview(seq.content, bundle.foundation, bundle.proof));
    const kept = (seq.checks as CheckResult[]).filter((c) => !c.key.startsWith("ai_"));
    must(await ctx.supabase.from("sequences").update({ checks: [...kept, ...aiChecks(review.data)] }).eq("id", id));
    await audit(ctx, "ai.outreach_review", { type: "sequence", id }, { model: review.model, tokens: review.tokens });
    revalidatePath(`/outreach/${id}`);
  });
}

export async function generateSequence(input: {
  accountId: string;
  contactId: string;
  productId: string;
  objective: Sequence["objective"];
  angle: string;
  channels: string[];
}) {
  return run(async () => {
    const ctx = await getContext();
    const [account, bundle, { data: contact }] = await Promise.all([
      loadAccount(ctx, input.accountId),
      loadProductBundle(ctx, input.productId),
      ctx.supabase.from("contacts").select("*").eq("id", input.contactId).single(),
    ]);
    if (!contact) throw new Error("Contact not found.");
    if (contact.opted_out) throw new Error("This contact has opted out. Outreach is blocked.");
    if (account.status === "disqualified") throw new Error("This account is disqualified. Outreach is blocked.");
    if (!input.channels.length) throw new Error("Pick at least one channel.");

    const res = await metered(ctx, "outreach_sequence", () =>
      ai.outreachSequence({
        ...bundle,
        account,
        contact: contact as Contact,
        objective: input.objective,
        angle: input.angle,
        channels: input.channels,
        senderName: ctx.org.settings?.sender_identity || ctx.displayName,
        senderCompany: ctx.org.name,
      }),
    );
    const content = res.data;
    // The AI quality review runs as a separate request (see runAIReview) to keep each call short.
    const checks = await deterministicChecks(ctx, { contact_id: input.contactId, content }, bundle.proof);
    if (!bundle.approved) {
      checks.unshift({
        key: "foundation",
        label: "Approved Sales Foundation",
        status: "warn",
        detail: "This product's foundation is not approved yet. Approve it before external messages go out.",
      });
    }
    const allChecks = [...checks, AI_NOT_RUN];

    const created = must(
      await ctx.supabase
        .from("sequences")
        .insert({
          org_id: ctx.org.id,
          product_id: input.productId,
          account_id: input.accountId,
          contact_id: input.contactId,
          objective: input.objective,
          angle: input.angle || null,
          content,
          checks: allChecks,
          created_by: ctx.user.id,
        })
        .select("id")
        .single(),
    );
    await audit(ctx, "ai.outreach_generate", { type: "sequence", id: created.id }, { model: res.model, tokens: res.tokens });
    revalidatePath("/outreach");
    revalidatePath(`/accounts/${input.accountId}`);
    return created.id as string;
  });
}

export async function saveSequence(id: string, content: SequenceContent) {
  return run(async () => {
    const ctx = await getContext();
    const { data: seq } = await ctx.supabase.from("sequences").select("*").eq("id", id).single();
    if (!seq) throw new Error("Sequence not found.");
    if (!["draft", "rejected"].includes(seq.status)) throw new Error("Only drafts can be edited.");
    const bundle = await loadProductBundle(ctx, seq.product_id);
    const checks = await deterministicChecks(ctx, { id, contact_id: seq.contact_id, content }, bundle.proof);
    // Content changed, so any previous AI review is stale.
    checks.push(AI_NOT_RUN);
    must(await ctx.supabase.from("sequences").update({ content, checks, status: "draft" }).eq("id", id));
    await audit(ctx, "sequence.edit", { type: "sequence", id });
    revalidatePath(`/outreach/${id}`);
  });
}

export async function approveSequence(id: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: seq } = await ctx.supabase.from("sequences").select("*").eq("id", id).single();
    if (!seq) throw new Error("Sequence not found.");
    const bundle = await loadProductBundle(ctx, seq.product_id);
    // Re-run the deterministic gate at approval time; state may have changed since drafting.
    const checks = await deterministicChecks(ctx, { id, contact_id: seq.contact_id, content: seq.content }, bundle.proof);
    const aiFails = (seq.checks as CheckResult[]).filter((c) => c.key.startsWith("ai_"));
    const fails = blockingFailures(checks);
    if (fails.length) {
      must(await ctx.supabase.from("sequences").update({ checks: [...checks, ...aiFails] }).eq("id", id));
      revalidatePath(`/outreach/${id}`);
      throw new Error(`Blocked by ${fails.length} failing check(s): ${fails.map((f) => f.label).join(", ")}.`);
    }
    must(
      await ctx.supabase
        .from("sequences")
        .update({ status: "approved", approved_by: ctx.user.id, approved_at: new Date().toISOString(), checks: [...checks, ...aiFails] })
        .eq("id", id),
    );
    await audit(ctx, "sequence.approve", { type: "sequence", id }, { checks: checks.map((c) => `${c.key}:${c.status}`) });
    revalidatePath(`/outreach/${id}`);
    revalidatePath("/outreach");
  });
}

export async function setSequenceStatus(id: string, status: "draft" | "rejected" | "active" | "stopped" | "completed", note?: string) {
  return run(async () => {
    const ctx = await getContext();
    const { data: seq } = await ctx.supabase.from("sequences").select("status, account_id").eq("id", id).single();
    if (!seq) throw new Error("Sequence not found.");
    if (status === "active" && seq.status !== "approved") throw new Error("Only approved sequences can be marked as sending.");
    must(await ctx.supabase.from("sequences").update({ status }).eq("id", id));
    await audit(ctx, `sequence.${status}`, { type: "sequence", id }, note ? { note } : {});
    if (status === "active") {
      await ctx.supabase.from("accounts").update({ status: "engaged" }).eq("id", seq.account_id).eq("status", "target");
    }
    revalidatePath(`/outreach/${id}`);
    revalidatePath("/outreach");
  });
}
