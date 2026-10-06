import "server-only";
import { adminClient } from "../supabase/admin";
import type { Ctx } from "../context";
import type { AIResult } from "../ai/client";
import { PLANS, isPlanId, type Plan } from "./plans";

export type BillingRow = {
  org_id: string;
  plan: string;
  status: "active" | "past_due" | "cancelled";
  seats: number;
  period_start: string | null;
  period_end: string | null;
  cancel_at_period_end: boolean;
  razorpay_subscription_id: string | null;
  credit_balance: number;
};

// Renewal webhooks can arrive a little after the period ends; keep the paid plan for a short grace.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const FREE_ROW = (orgId: string): BillingRow => ({
  org_id: orgId,
  plan: "free",
  status: "active",
  seats: 1,
  period_start: null,
  period_end: null,
  cancel_at_period_end: false,
  razorpay_subscription_id: null,
  credit_balance: 0,
});

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function nextMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** The plan an org is entitled to right now, with its allowance window. */
export function entitlement(row: BillingRow) {
  const now = Date.now();
  const lapsed =
    row.status === "cancelled" || (row.period_end !== null && new Date(row.period_end).getTime() + GRACE_MS < now);
  const plan: Plan = !lapsed && isPlanId(row.plan) ? PLANS[row.plan] : PLANS.free;
  const paid = plan.id !== "free";
  const seats = plan.perSeat ? row.seats : 1;
  const periodStart = paid && row.period_start ? new Date(row.period_start) : monthStart();
  const periodEnd = paid && row.period_end ? new Date(row.period_end) : nextMonthStart();
  return {
    plan,
    seats,
    allowance: plan.aiActions * seats,
    periodStart,
    periodEnd,
    credits: row.credit_balance,
    status: paid ? row.status : "active",
    cancelAtPeriodEnd: paid && row.cancel_at_period_end,
  };
}

export type Entitlement = ReturnType<typeof entitlement>;

export async function loadBilling(orgId: string): Promise<BillingRow> {
  const { data, error } = await adminClient().from("org_billing").select("*").eq("org_id", orgId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BillingRow | null) ?? FREE_ROW(orgId);
}

export async function loadEntitlement(orgId: string) {
  return entitlement(await loadBilling(orgId));
}

/** AI actions used from the plan allowance in the current period. */
export async function planUsage(orgId: string, since: Date) {
  const { count, error } = await adminClient()
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("source", "plan")
    .neq("status", "refunded")
    .gte("created_at", since.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export class QuotaError extends Error {}

/**
 * Meters one AI request: reserves an action (monthly allowance first, then top-up credits),
 * runs the request, and refunds the action if the request fails.
 */
export async function metered<T>(ctx: Ctx, feature: string, fn: () => Promise<AIResult<T>>): Promise<AIResult<T>> {
  const ent = await loadEntitlement(ctx.org.id);
  const admin = adminClient();
  const { data, error } = await admin.rpc("consume_ai_action", {
    p_org: ctx.org.id,
    p_user: ctx.user.id,
    p_feature: feature,
    p_allowance: ent.allowance,
    p_period_start: ent.periodStart.toISOString(),
  } as never);
  if (error) throw new Error(error.message);
  const reserved = (data as { usage_id: number; source: string }[] | null)?.[0];
  if (!reserved) {
    throw new QuotaError(
      `You've used all ${ent.allowance} AI actions on the ${ent.plan.name} plan this month. Buy a top-up pack or upgrade in Billing.`,
    );
  }

  try {
    const res = await fn();
    await admin
      .from("ai_usage")
      .update({ status: "done", model: res.model, tokens: res.tokens } as never)
      .eq("id", reserved.usage_id);
    return res;
  } catch (e) {
    await admin.rpc("refund_ai_action", { p_usage: reserved.usage_id } as never);
    throw e;
  }
}

export async function assertCanAddProduct(ctx: Ctx) {
  const ent = await loadEntitlement(ctx.org.id);
  if (ent.plan.maxProducts === null) return;
  const { count } = await ctx.supabase.from("products").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= ent.plan.maxProducts) {
    throw new QuotaError(
      `The ${ent.plan.name} plan includes ${ent.plan.maxProducts} product${ent.plan.maxProducts === 1 ? "" : "s"}. Upgrade in Billing to add more.`,
    );
  }
}

export async function assertCanAddMember(ctx: Ctx) {
  const ent = await loadEntitlement(ctx.org.id);
  const [{ count: members }, { count: invites }] = await Promise.all([
    ctx.supabase.from("org_members").select("user_id", { count: "exact", head: true }),
    ctx.supabase.from("org_invites").select("id", { count: "exact", head: true }).is("accepted_at", null),
  ]);
  if ((members ?? 0) + (invites ?? 0) >= ent.seats) {
    throw new QuotaError(
      ent.plan.perSeat
        ? `All ${ent.seats} seats are in use. Add seats in Billing to invite more people.`
        : `The ${ent.plan.name} plan has 1 seat. Switch to Team in Billing to invite teammates.`,
    );
  }
}
