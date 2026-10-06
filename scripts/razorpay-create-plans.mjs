// Creates the monthly Razorpay plans once and prints the env lines to add.
// Usage: RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... node scripts/razorpay-create-plans.mjs
//
// Amounts are per seat per month INCLUDING 18% GST, and must match src/lib/billing/plans.ts
// (withGst(pricePaise)). Razorpay plans can't be edited: to change a price, create a new plan
// and update the env var. Existing subscribers stay on the old plan until they switch.

const PLANS = [
  { key: "STARTER", name: "OpenRiverStack Starter", amount: Math.round(99900 * 1.18) },
  { key: "PRO", name: "OpenRiverStack Pro", amount: Math.round(249900 * 1.18) },
  { key: "TEAM", name: "OpenRiverStack Team (per seat)", amount: Math.round(399900 * 1.18) },
];

const id = process.env.RAZORPAY_KEY_ID;
const secret = process.env.RAZORPAY_KEY_SECRET;
if (!id || !secret) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first.");
  process.exit(1);
}
const auth = "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");

for (const p of PLANS) {
  const res = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: { name: p.name, amount: p.amount, currency: "INR", description: "Monthly subscription, incl. 18% GST" },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`Failed to create ${p.name}:`, json?.error?.description ?? json);
    process.exit(1);
  }
  console.log(`RAZORPAY_PLAN_${p.key}=${json.id}`);
}
