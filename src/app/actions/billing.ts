"use server";

import { revalidatePath } from "next/cache";
import { getContext, run, audit, canManage, type Ctx } from "@/lib/context";
import { adminClient } from "@/lib/supabase/admin";
import { loadBilling, loadEntitlement } from "@/lib/billing";
import { PACKS, PLANS, isPlanId, withGst, type PackId, type PlanId } from "@/lib/billing/plans";
import * as rzp from "@/lib/billing/razorpay";
import { grantCreditPurchase, syncSubscription } from "@/lib/billing/sync";

export type CheckoutOpen = {
  keyId: string;
  subscriptionId?: string;
  orderId?: string;
  amountPaise?: number;
  description: string;
  prefill: { name: string; email: string };
};

function requireBillingAdmin(ctx: Ctx) {
  if (!canManage(ctx.role)) throw new Error("Only owners and managers can manage billing.");
}

function prefill(ctx: Ctx) {
  return { name: ctx.displayName, email: ctx.user.email ?? "" };
}

/** Creates a Razorpay subscription for the checkout popup. The plan switches once payment succeeds. */
export async function startSubscription(planId: PlanId, seatsInput: number) {
  return run<CheckoutOpen>(async () => {
    const ctx = await getContext();
    requireBillingAdmin(ctx);
    if (!isPlanId(planId) || planId === "free") throw new Error("Choose a paid plan.");
    const plan = PLANS[planId];

    let seats = 1;
    if (plan.perSeat) {
      seats = Math.floor(Number(seatsInput));
      if (!Number.isFinite(seats) || seats < 1 || seats > 500) throw new Error("Seats must be between 1 and 500.");
      const { count } = await ctx.supabase.from("org_members").select("user_id", { count: "exact", head: true });
      if (seats < (count ?? 1)) throw new Error(`You have ${count} members. Choose at least ${count} seats.`);
    }

    const ent = await loadEntitlement(ctx.org.id);
    if (ent.plan.id === planId && ent.seats === seats && !ent.cancelAtPeriodEnd) {
      throw new Error(`You're already on ${plan.name}${plan.perSeat ? ` with ${seats} seats` : ""}.`);
    }

    const sub = await rzp.createSubscription({
      planId: rzp.razorpayPlanId(planId),
      quantity: seats,
      notes: { org_id: ctx.org.id, plan: planId },
    });
    const { error } = await adminClient()
      .from("billing_subscriptions")
      .insert({ razorpay_subscription_id: sub.id, org_id: ctx.org.id, plan: planId, seats, status: sub.status, created_by: ctx.user.id } as never);
    if (error) throw new Error(error.message);

    return {
      keyId: rzp.razorpayKeyId(),
      subscriptionId: sub.id,
      description: `${plan.name} plan${plan.perSeat ? ` · ${seats} seat${seats === 1 ? "" : "s"}` : ""} · monthly`,
      prefill: prefill(ctx),
    };
  });
}

/** Called by the checkout success handler. The webhook applies the same change if this never runs. */
export async function confirmSubscription(p: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) {
  return run(async () => {
    const ctx = await getContext();
    if (!rzp.verifySubscriptionSignature(p.razorpay_payment_id, p.razorpay_subscription_id, p.razorpay_signature)) {
      throw new Error("Payment could not be verified. If you were charged, it will be applied automatically within a few minutes.");
    }
    const { data } = await adminClient()
      .from("billing_subscriptions")
      .select("org_id, plan")
      .eq("razorpay_subscription_id", p.razorpay_subscription_id)
      .maybeSingle();
    const row = data as { org_id: string; plan: string } | null;
    if (!row || row.org_id !== ctx.org.id) throw new Error("Subscription not found.");

    await syncSubscription(await rzp.fetchSubscription(p.razorpay_subscription_id));
    await audit(ctx, "billing.subscribe", undefined, { plan: row.plan, subscription: p.razorpay_subscription_id });
    revalidatePath("/", "layout");
  });
}

/** Cancels at the end of the paid period; the org keeps its plan until then. */
export async function cancelPlan() {
  return run(async () => {
    const ctx = await getContext();
    requireBillingAdmin(ctx);
    const billing = await loadBilling(ctx.org.id);
    if (!billing.razorpay_subscription_id) throw new Error("There's no active subscription to cancel.");
    await rzp.cancelSubscription(billing.razorpay_subscription_id, true);
    await adminClient().from("org_billing").update({ cancel_at_period_end: true } as never).eq("org_id", ctx.org.id);
    await audit(ctx, "billing.cancel", undefined, { plan: billing.plan, subscription: billing.razorpay_subscription_id });
    revalidatePath("/billing");
  });
}

/** Creates a Razorpay order for a one-time AI action top-up. */
export async function buyCredits(packId: PackId) {
  return run<CheckoutOpen>(async () => {
    const ctx = await getContext();
    requireBillingAdmin(ctx);
    const pack = PACKS[packId];
    if (!pack) throw new Error("Unknown pack.");
    const amount = withGst(pack.pricePaise);
    const order = await rzp.createOrder({
      amountPaise: amount,
      receipt: `topup_${Date.now()}`,
      notes: { org_id: ctx.org.id, pack: pack.id, credits: String(pack.credits) },
    });
    const { error } = await adminClient()
      .from("credit_purchases")
      .insert({ org_id: ctx.org.id, pack: pack.id, credits: pack.credits, amount_paise: amount, razorpay_order_id: order.id, created_by: ctx.user.id } as never);
    if (error) throw new Error(error.message);
    return {
      keyId: rzp.razorpayKeyId(),
      orderId: order.id,
      amountPaise: amount,
      description: `${pack.credits} AI actions top-up`,
      prefill: prefill(ctx),
    };
  });
}

export async function confirmCredits(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  return run(async () => {
    const ctx = await getContext();
    if (!rzp.verifyOrderSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature)) {
      throw new Error("Payment could not be verified. If you were charged, the credits will be added automatically within a few minutes.");
    }
    const { data } = await adminClient()
      .from("credit_purchases")
      .select("org_id, credits")
      .eq("razorpay_order_id", p.razorpay_order_id)
      .maybeSingle();
    const row = data as { org_id: string; credits: number } | null;
    if (!row || row.org_id !== ctx.org.id) throw new Error("Order not found.");
    if (await grantCreditPurchase(p.razorpay_order_id, p.razorpay_payment_id)) {
      await audit(ctx, "billing.topup", undefined, { order: p.razorpay_order_id, credits: row.credits });
    }
    revalidatePath("/billing");
  });
}
