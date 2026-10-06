import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { fetchSubscription, verifyWebhookSignature } from "@/lib/billing/razorpay";
import { grantCreditPurchase, syncSubscription } from "@/lib/billing/sync";

export const dynamic = "force-dynamic";

type WebhookBody = {
  event: string;
  payload: {
    subscription?: { entity: { id: string } };
    order?: { entity: { id: string } };
    payment?: { entity: { id: string; order_id?: string | null; status?: string } };
  };
};

/**
 * Razorpay webhook. Configure in Dashboard → Webhooks with the events:
 * subscription.activated, subscription.charged, subscription.pending, subscription.halted,
 * subscription.cancelled, subscription.completed, order.paid.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(raw) as WebhookBody;
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  const admin = adminClient();

  if (eventId) {
    const { data: seen } = await admin.from("billing_events").select("event_id").eq("event_id", eventId).maybeSingle();
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (body.event.startsWith("subscription.") && body.payload.subscription) {
      // Events can arrive out of order; always apply the subscription's latest state.
      await syncSubscription(await fetchSubscription(body.payload.subscription.entity.id));
    } else if (body.event === "order.paid" && body.payload.order && body.payload.payment) {
      await grantCreditPurchase(body.payload.order.entity.id, body.payload.payment.entity.id);
    } else if (body.event === "payment.captured" && body.payload.payment?.entity.order_id) {
      await grantCreditPurchase(body.payload.payment.entity.order_id, body.payload.payment.entity.id);
    }
  } catch (e) {
    console.error("Razorpay webhook failed", body.event, e);
    // Non-2xx makes Razorpay retry; every handler above is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  if (eventId) {
    await admin.from("billing_events").insert({ event_id: eventId, event: body.event, payload: body } as never);
  }
  return NextResponse.json({ ok: true });
}
