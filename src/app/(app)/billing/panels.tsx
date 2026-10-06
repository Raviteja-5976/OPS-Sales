"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check } from "lucide-react";
import {
  buyCredits,
  cancelPlan,
  confirmCredits,
  confirmSubscription,
  startSubscription,
  type CheckoutOpen,
} from "@/app/actions/billing";
import { ActionButton, ErrorText, Spinner } from "@/components/actions";
import {
  PACKS,
  PAID_PLANS,
  fmtInr,
  withGst,
  type PackId,
  type PlanId,
} from "@/lib/billing/plans";

// ---------------------------------------------------------------------------
// Razorpay Checkout
// ---------------------------------------------------------------------------

type RzpResponse = {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (
        e: string,
        cb: (r: { error: { description: string } }) => void,
      ) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(
        new Error(
          "Could not load Razorpay Checkout. Check your connection and try again.",
        ),
      );
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/** Opens Razorpay Checkout; resolves with the payment response, or null if the buyer closed it. */
async function openCheckout(o: CheckoutOpen): Promise<RzpResponse | null> {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: o.keyId,
      subscription_id: o.subscriptionId,
      order_id: o.orderId,
      amount: o.amountPaise,
      currency: "INR",
      name: "OpenRiverStack",
      description: o.description,
      prefill: o.prefill,
      theme: { color: "#d97706" },
      handler: (r: RzpResponse) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on("payment.failed", (r) =>
      reject(new Error(r.error?.description || "Payment failed.")),
    );
    rzp.open();
  });
}

function useCheckout() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function go(
    key: string,
    start: () => Promise<
      { ok: true; data?: CheckoutOpen } | { ok: false; error: string }
    >,
    confirm: (
      r: RzpResponse,
    ) => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    setError(null);
    setNotice(null);
    setBusy(key);
    try {
      const res = await start();
      if (!res.ok) throw new Error(res.error);
      const paid = await openCheckout(res.data!);
      if (!paid) return;
      const c = await confirm(paid);
      if (!c.ok) throw new Error(c.error);
      setNotice(success);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, notice, go };
}

function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function PlanPicker({
  currentPlan,
  currentSeats,
  cancelling,
  canManage,
}: {
  currentPlan: PlanId;
  currentSeats: number;
  cancelling: boolean;
  canManage: boolean;
}) {
  const { busy, error, notice, go } = useCheckout();
  const [seats, setSeats] = useState(currentPlan === "team" ? currentSeats : 2);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((p) => {
          const qty = p.perSeat ? Math.max(1, seats) : 1;
          const current = p.id === currentPlan;
          const sameSeats = !p.perSeat || qty === currentSeats;
          const isCurrent = current && sameSeats && !cancelling;
          const label = isCurrent
            ? "Current plan"
            : current
              ? cancelling && sameSeats
                ? "Resubscribe"
                : "Change seats"
              : currentPlan === "free"
                ? "Subscribe"
                : "Switch plan";
          return (
            <div
              key={p.id}
              className={clsx(
                "card card-pad flex flex-col",
                p.id === "pro" && "ring-2 ring-amber-400",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{p.name}</div>
                {p.id === "pro" && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Most popular
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="num text-2xl font-bold text-slate-900">
                  {fmtInr(p.pricePaise)}
                </span>
                <span className="text-sm text-slate-500">
                  {p.perSeat ? " /seat/month" : " /month"}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                + GST · {fmtInr(withGst(p.pricePaise * qty))}/month total
                {p.perSeat ? ` for ${qty} seat${qty === 1 ? "" : "s"}` : ""}
              </div>
              <p className="mt-3 text-sm text-slate-600">{p.blurb}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              {p.perSeat && (
                <label className="mt-3 block">
                  <span className="label">Seats</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={500}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    disabled={!canManage}
                  />
                </label>
              )}
              <button
                className={clsx(
                  "btn mt-4 w-full justify-center",
                  !isCurrent && "btn-primary",
                )}
                disabled={!canManage || isCurrent || !!busy}
                onClick={() =>
                  go(
                    p.id,
                    () => startSubscription(p.id, qty),
                    (r) =>
                      confirmSubscription({
                        razorpay_payment_id: r.razorpay_payment_id,
                        razorpay_subscription_id: r.razorpay_subscription_id!,
                        razorpay_signature: r.razorpay_signature,
                      }),
                    `You're on ${p.name} now.`,
                  )
                }
              >
                {busy === p.id && <Spinner />} {label}
              </button>
            </div>
          );
        })}
      </div>
      {currentPlan !== "free" && (
        <p className="muted mt-3 text-xs">
          Switching plans starts a new monthly subscription immediately and
          stops the old one. The new allowance starts from the switch date.
        </p>
      )}
      <ErrorText error={error} />
      <Notice text={notice} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-up packs
// ---------------------------------------------------------------------------

const fmtPerAction = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);

export function PackPicker({ canManage }: { canManage: boolean }) {
  const { busy, error, notice, go } = useCheckout();
  const packs = Object.values(PACKS);
  const baseRate = packs[0].pricePaise / packs[0].credits;
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {packs.map((p) => {
          const rate = p.pricePaise / p.credits;
          const saving = Math.round((1 - rate / baseRate) * 100);
          return (
            <div key={p.id} className="card card-pad">
              <div className="flex items-center justify-between">
                <div className="num text-xl font-bold text-slate-900">
                  {p.credits.toLocaleString("en-IN")} actions
                </div>
                {saving > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Save {saving}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                <span className="num font-semibold text-slate-900">
                  {fmtInr(p.pricePaise)}
                </span>{" "}
                + GST{" "}
                <span className="text-slate-400">
                  · {fmtPerAction(rate)}/action
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {fmtInr(withGst(p.pricePaise))} total incl. 18% GST
              </div>
              <button
                className="btn btn-primary mt-3 w-full justify-center"
                disabled={!canManage || !!busy}
                onClick={() =>
                  go(
                    p.id,
                    () => buyCredits(p.id as PackId),
                    (r) =>
                      confirmCredits({
                        razorpay_order_id: r.razorpay_order_id!,
                        razorpay_payment_id: r.razorpay_payment_id,
                        razorpay_signature: r.razorpay_signature,
                      }),
                    `${p.credits} AI actions added.`,
                  )
                }
              >
                {busy === p.id && <Spinner />} Buy{" "}
                {p.credits.toLocaleString("en-IN")} actions
              </button>
            </div>
          );
        })}
      </div>
      <ErrorText error={error} />
      <Notice text={notice} />
    </div>
  );
}

export function CancelPlanButton({ periodEnd }: { periodEnd: string }) {
  return (
    <ActionButton
      action={() => cancelPlan()}
      className="btn-sm"
      confirmText={`Cancel? You keep your plan until ${periodEnd}.`}
      pendingText="Cancelling…"
    >
      Cancel subscription
    </ActionButton>
  );
}
