// Plan catalogue. Shared by server and client (no secrets here).
// Prices are in paise and exclude GST; GST is added at checkout.

export const GST_RATE = 0.18;

export type PlanId = "free" | "starter" | "pro" | "team";

export type Plan = {
  id: PlanId;
  name: string;
  pricePaise: number; // per seat per month, excl. GST
  aiActions: number; // per seat per month
  maxProducts: number | null; // null = unlimited
  perSeat: boolean; // Team is billed per seat; other plans are single-seat
  blurb: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    pricePaise: 0,
    aiActions: 30,
    maxProducts: 1,
    perSeat: false,
    blurb: "Try the workflow on one product.",
    features: ["1 product", "30 AI actions / month", "1 seat"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    pricePaise: 999_00,
    aiActions: 200,
    maxProducts: 1,
    perSeat: false,
    blurb: "For a founder selling one product.",
    features: ["1 product", "200 AI actions / month", "1 seat", "Top-up packs"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    pricePaise: 2_499_00,
    aiActions: 700,
    maxProducts: 3,
    perSeat: false,
    blurb: "For an active seller running several products.",
    features: ["3 products", "700 AI actions / month", "1 seat", "Top-up packs"],
  },
  team: {
    id: "team",
    name: "Team",
    pricePaise: 3_999_00,
    aiActions: 2000,
    maxProducts: null,
    perSeat: true,
    blurb: "For sales teams sharing one workspace.",
    features: ["Unlimited products", "2,000 AI actions / seat / month (pooled)", "Billed per seat", "Top-up packs"],
  },
};

export const PAID_PLANS = [PLANS.starter, PLANS.pro, PLANS.team];

export type PackId = "pack_100" | "pack_300" | "pack_1000";

export type Pack = { id: PackId; credits: number; pricePaise: number };

/** One-time AI action top-ups. They never expire and are used after the monthly allowance. */
export const PACKS: Record<PackId, Pack> = {
  pack_100: { id: "pack_100", credits: 100, pricePaise: 399_00 },
  pack_300: { id: "pack_300", credits: 300, pricePaise: 999_00 },
  pack_1000: { id: "pack_1000", credits: 1000, pricePaise: 2_999_00 },
};

export const withGst = (paise: number) => Math.round(paise * (1 + GST_RATE));

export function fmtInr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function isPlanId(v: string): v is PlanId {
  return v in PLANS;
}
