import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "./plans";

const API = "https://api.razorpay.com/v1";

function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured on the server.");
  return { id, secret };
}

export function razorpayKeyId() {
  return keys().id;
}

/** Razorpay plan id (created once in the dashboard or with scripts/razorpay-create-plans.mjs). */
export function razorpayPlanId(plan: Exclude<PlanId, "free">) {
  const id = process.env[`RAZORPAY_PLAN_${plan.toUpperCase()}`];
  if (!id) throw new Error(`RAZORPAY_PLAN_${plan.toUpperCase()} is not configured on the server.`);
  return id;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { id, secret } = keys();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Razorpay error", path, json);
    throw new Error(json?.error?.description || "The payment provider rejected the request. Please try again.");
  }
  return json as T;
}

export type RzpSubscription = {
  id: string;
  plan_id: string;
  status: string;
  quantity: number;
  current_start: number | null; // unix seconds
  current_end: number | null;
  notes: Record<string, string>;
};

export type RzpOrder = { id: string; amount: number; currency: string; status: string; notes: Record<string, string> };

export function createSubscription(args: { planId: string; quantity: number; notes: Record<string, string> }) {
  return call<RzpSubscription>("POST", "/subscriptions", {
    plan_id: args.planId,
    quantity: args.quantity,
    total_count: 120, // monthly for up to 10 years; cancelled by the customer, not by expiry
    customer_notify: 1,
    notes: args.notes,
  });
}

export function fetchSubscription(id: string) {
  return call<RzpSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

export function cancelSubscription(id: string, atCycleEnd: boolean) {
  return call<RzpSubscription>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });
}

export function createOrder(args: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return call<RzpOrder>("POST", "/orders", { amount: args.amountPaise, currency: "INR", receipt: args.receipt, notes: args.notes });
}

function hmacEquals(payload: string, secret: string, signature: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout signature for a subscription payment. */
export function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string) {
  return hmacEquals(`${paymentId}|${subscriptionId}`, keys().secret, signature);
}

/** Checkout signature for an order payment. */
export function verifyOrderSignature(orderId: string, paymentId: string, signature: string) {
  return hmacEquals(`${orderId}|${paymentId}`, keys().secret, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
  return hmacEquals(rawBody, secret, signature);
}

export const fromUnix = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);
