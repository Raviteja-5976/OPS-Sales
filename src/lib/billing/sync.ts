import "server-only";
import { adminClient } from "../supabase/admin";
import { cancelSubscription, fromUnix, type RzpSubscription } from "./razorpay";
import { isPlanId } from "./plans";

const ENDED = new Set(["halted", "cancelled", "completed", "expired"]);

/**
 * Applies a Razorpay subscription's state to our records. Safe to call repeatedly with the same
 * data (checkout confirmation and webhooks both call it).
 */
export async function syncSubscription(sub: RzpSubscription) {
  const admin = adminClient();
  const { data: known } = await admin
    .from("billing_subscriptions")
    .select("org_id, plan")
    .eq("razorpay_subscription_id", sub.id)
    .maybeSingle();
  const row = known as { org_id: string; plan: string } | null;
  if (!row) {
    // Not created by us (or a different environment sharing the Razorpay account).
    console.warn("Razorpay subscription not found locally", sub.id);
    return;
  }

  await admin
    .from("billing_subscriptions")
    .update({
      status: sub.status,
      seats: sub.quantity ?? 1,
      current_start: fromUnix(sub.current_start),
      current_end: fromUnix(sub.current_end),
    } as never)
    .eq("razorpay_subscription_id", sub.id);

  const { data: billingData } = await admin
    .from("org_billing")
    .select("razorpay_subscription_id")
    .eq("org_id", row.org_id)
    .maybeSingle();
  const currentId = (billingData as { razorpay_subscription_id: string | null } | null)?.razorpay_subscription_id ?? null;
  const isCurrent = currentId === sub.id;

  if (sub.status === "active" || sub.status === "authenticated") {
    if (!isPlanId(row.plan)) return;
    await admin.from("org_billing").upsert(
      {
        org_id: row.org_id,
        plan: row.plan,
        status: "active",
        seats: Math.max(1, sub.quantity ?? 1),
        period_start: fromUnix(sub.current_start) ?? new Date().toISOString(),
        period_end: fromUnix(sub.current_end),
        razorpay_subscription_id: sub.id,
        ...(isCurrent ? {} : { cancel_at_period_end: false }),
      } as never,
      { onConflict: "org_id" },
    );
    // Plan change: the new subscription replaces the old one, which stops billing now.
    if (currentId && !isCurrent) {
      await admin.from("billing_subscriptions").update({ status: "cancelled" } as never).eq("razorpay_subscription_id", currentId);
      await cancelSubscription(currentId, false).catch((e) => console.error("Could not cancel replaced subscription", currentId, e));
    }
    return;
  }

  if (!isCurrent) return;
  if (sub.status === "pending") {
    // A renewal charge failed; Razorpay is retrying. Keep access while it does.
    await admin.from("org_billing").update({ status: "past_due" } as never).eq("org_id", row.org_id);
  } else if (ENDED.has(sub.status)) {
    await admin
      .from("org_billing")
      .update({ plan: "free", status: "active", seats: 1, period_start: null, period_end: null, cancel_at_period_end: false, razorpay_subscription_id: null } as never)
      .eq("org_id", row.org_id);
  }
}

/** Credits a paid top-up order exactly once. */
export async function grantCreditPurchase(orderId: string, paymentId: string) {
  const { data, error } = await adminClient().rpc("grant_credit_purchase", { p_order: orderId, p_payment: paymentId } as never);
  if (error) throw new Error(error.message);
  return data as boolean;
}
