import { BELIEF_KEYS, BELIEFS, DEAL_STAGES, type Deal, type DealEvidence, type DealStage } from "./types";

export type Readiness = "ready" | "caution" | "missing";

export type HealthCheck = {
  key: string;
  label: string;
  ok: boolean;
  critical: boolean;
  detail: string;
};

export type DealHealth = {
  status: Readiness;
  completeness: number; // 0-100 share of discovery evidence captured
  checks: HealthCheck[]; // checks relevant to exiting the current stage
  redFlags: string[];
  presentation: { unlocked: boolean; reasons: string[] };
  nextStage: DealStage | null;
};

const NEXT_STAGE: Partial<Record<DealStage, DealStage>> = {
  prospecting: "discovery",
  discovery: "qualified",
  qualified: "proposal",
  proposal: "commit",
  commit: "won",
};

function annualize(amount: number | null, cadence: "monthly" | "annual") {
  if (amount === null || Number.isNaN(amount)) return null;
  return cadence === "monthly" ? amount * 12 : amount;
}

function isPast(date: string | null) {
  if (!date) return false;
  const d = new Date(date + (date.length === 10 ? "T23:59:59" : ""));
  return d.getTime() < Date.now();
}

/** Every evidence check, keyed so stages can declare which ones gate their exit. */
function allChecks(deal: Pick<Deal, "amount" | "stage">, e: DealEvidence): Record<string, Omit<HealthCheck, "critical">> {
  const current = e.current_state.facts.length + e.current_state.metrics.length;
  const confirmedRoadblocks = e.roadblocks.filter((r) => r.source === "buyer-confirmed").length;
  const ns = e.next_step;
  const gapAnnual = annualize(e.value_gap.amount, e.value_gap.cadence);
  const econBuyer = e.stakeholders.some((s) => s.role === "economic_buyer");
  const scores = BELIEF_KEYS.map((k) => e.buying_beliefs[k]?.score ?? 0);
  const minBelief = Math.min(...scores);

  return {
    fit: {
      key: "fit",
      label: "Account fit is explained",
      ok: e.account_fit.reason.trim().length > 0,
      detail: "Record why this account fits the ICP and why now.",
    },
    next_step: {
      key: "next_step",
      label: "Specific next step (owner, date, purpose)",
      ok: !!(ns.owner && ns.date && ns.purpose) && !isPast(ns.date),
      detail: isPast(ns.date)
        ? "The next-step date has passed. Confirm a new one with the buyer."
        : "A next step needs an owner, a date and a purpose — not \"follow up soon\".",
    },
    current_state: {
      key: "current_state",
      label: "Current state: 2+ buyer facts or metrics",
      ok: current >= 2,
      detail: `${current} captured. Separate verifiable operating facts from opinions.`,
    },
    desired_state: {
      key: "desired_state",
      label: "Desired state is measurable and dated",
      ok: e.desired_state.metrics.length > 0 && !!e.desired_state.target_date,
      detail: "A target metric plus a target date defines the gap.",
    },
    roadblock: {
      key: "roadblock",
      label: "Buyer-confirmed roadblock",
      ok: confirmedRoadblocks > 0,
      detail: "Why hasn't the buyer solved this internally? It must come from the buyer.",
    },
    prior_attempts: {
      key: "prior_attempts",
      label: "Prior attempts understood",
      ok: e.prior_attempts.length > 0,
      detail: "Prevents the \"we'll build it in-house\" objection later.",
    },
    stakeholders: {
      key: "stakeholders",
      label: "At least one stakeholder mapped",
      ok: e.stakeholders.length > 0,
      detail: "Who is involved and what is their stance?",
    },
    gap: {
      key: "gap",
      label: "Value gap quantified",
      ok: (e.value_gap.amount ?? 0) > 0,
      detail: e.value_gap.buyer_confirmed
        ? "Buyer confirmed the gap."
        : "Calculate the gap between current and target, and ask the buyer to confirm it.",
    },
    cost_of_inaction: {
      key: "cost_of_inaction",
      label: "Cost of inaction recorded",
      ok: (e.cost_of_inaction.amount ?? 0) > 0,
      detail:
        e.cost_of_inaction.confidence === "buyer-confirmed"
          ? "Buyer confirmed."
          : "Record it — clearly marked as an estimate until the buyer confirms it.",
    },
    decision_process: {
      key: "decision_process",
      label: "Decision process mapped",
      ok: e.decision_process.people.length > 0 && !!e.decision_process.date,
      detail: "Who decides, by when, and through which procurement/security steps?",
    },
    economic_buyer: {
      key: "economic_buyer",
      label: "Economic buyer identified",
      ok: econBuyer,
      detail: "Price objections often come from talking to the wrong budget owner.",
    },
    gap_vs_price: {
      key: "gap_vs_price",
      label: "Annual gap ≥ 3× deal value",
      ok: gapAnnual === null || !deal.amount ? false : gapAnnual >= 3 * deal.amount,
      detail:
        gapAnnual === null || !deal.amount
          ? "Needs both a deal amount and a quantified gap."
          : `Annual gap ${Math.round(gapAnnual).toLocaleString()} vs deal ${deal.amount.toLocaleString()}.`,
    },
    beliefs: {
      key: "beliefs",
      label: "All seven buying beliefs ≥ 8/10",
      ok: minBelief >= 8,
      detail: `Weakest: ${BELIEFS[BELIEF_KEYS[scores.indexOf(minBelief)]].label} (${minBelief}/10).`,
    },
    mutual_plan: {
      key: "mutual_plan",
      label: "Mutual action plan with owners and dates",
      ok: e.commitments.length >= 2 && e.commitments.every((c) => c.owner && c.due),
      detail: "At least two commitments, each with an owner and due date.",
    },
    multi_threaded: {
      key: "multi_threaded",
      label: "Multi-threaded (2+ stakeholders)",
      ok: e.stakeholders.length >= 2,
      detail: "Single-threaded deals stall when the one contact goes quiet.",
    },
  };
}

/** Which checks gate leaving each stage, and whether each is critical. */
const STAGE_GATES: Record<DealStage, { key: string; critical: boolean }[]> = {
  prospecting: [
    { key: "fit", critical: true },
    { key: "next_step", critical: true },
  ],
  discovery: [
    { key: "current_state", critical: true },
    { key: "desired_state", critical: false },
    { key: "roadblock", critical: true },
    { key: "stakeholders", critical: false },
    { key: "next_step", critical: true },
  ],
  qualified: [
    { key: "gap", critical: true },
    { key: "cost_of_inaction", critical: true },
    { key: "roadblock", critical: true },
    { key: "prior_attempts", critical: false },
    { key: "decision_process", critical: true },
    { key: "economic_buyer", critical: false },
    { key: "gap_vs_price", critical: false },
    { key: "beliefs", critical: false },
    { key: "next_step", critical: true },
  ],
  proposal: [
    { key: "mutual_plan", critical: true },
    { key: "decision_process", critical: true },
    { key: "multi_threaded", critical: false },
    { key: "economic_buyer", critical: true },
    { key: "next_step", critical: true },
  ],
  commit: [
    { key: "mutual_plan", critical: true },
    { key: "next_step", critical: false },
  ],
  won: [],
  lost: [],
  nurture: [],
};

export function computeDealHealth(deal: Pick<Deal, "amount" | "stage">, e: DealEvidence): DealHealth {
  const all = allChecks(deal, e);
  const checks: HealthCheck[] = STAGE_GATES[deal.stage].map((g) => ({ ...all[g.key], critical: g.critical }));

  const failingCritical = checks.filter((c) => c.critical && !c.ok);
  const failingSoft = checks.filter((c) => !c.critical && !c.ok);
  const status: Readiness = failingCritical.length ? "missing" : failingSoft.length ? "caution" : "ready";

  // Discovery completeness across the core evidence, independent of stage.
  const coreKeys = ["current_state", "desired_state", "gap", "roadblock", "prior_attempts", "cost_of_inaction", "decision_process", "stakeholders"];
  const completeness = Math.round((coreKeys.filter((k) => all[k].ok).length / coreKeys.length) * 100);

  const redFlags: string[] = [];
  const open = !["won", "lost", "nurture"].includes(deal.stage);
  if (open) {
    if (e.stakeholders.length < 2 && ["qualified", "proposal", "commit"].includes(deal.stage))
      redFlags.push("Single-threaded: only one stakeholder is mapped.");
    if (!all.gap.ok && ["qualified", "proposal", "commit"].includes(deal.stage))
      redFlags.push("No economic impact quantified — price will be judged in a vacuum.");
    if (!all.decision_process.ok && ["proposal", "commit"].includes(deal.stage))
      redFlags.push("No decision process: who signs and when is unknown.");
    if (!e.next_step.date || !e.next_step.owner) redFlags.push("No clear next step with an owner and date.");
    else if (isPast(e.next_step.date)) redFlags.push("Next step is overdue.");
    const efficacy = e.buying_beliefs.self_efficacy?.score;
    if (efficacy !== null && efficacy !== undefined && efficacy < 5)
      redFlags.push("Low implementation confidence — adoption capacity is at risk.");
    const hypotheses =
      e.current_state.facts.filter((f) => f.source === "ai-hypothesis").length +
      e.roadblocks.filter((f) => f.source === "ai-hypothesis").length;
    if (hypotheses > 0) redFlags.push(`${hypotheses} unverified AI hypothesis item(s) in the record — confirm with the buyer.`);
    const openObjections = e.objections.filter((o) => o.status === "open").length;
    if (openObjections > 0) redFlags.push(`${openObjections} open objection(s) not yet diagnosed or resolved.`);
  }

  // part2 presentation unlock rule, applied as a soft guardrail.
  const reasons: string[] = [];
  if (!((e.value_gap.amount ?? 0) > 0)) reasons.push("Gap delta is not quantified.");
  if (!((e.cost_of_inaction.amount ?? 0) > 0)) reasons.push("Cost of inaction is not quantified.");
  if (!all.roadblock.ok) reasons.push("No buyer-confirmed roadblock.");
  if (!all.beliefs.ok) reasons.push(all.beliefs.detail);

  return {
    status,
    completeness,
    checks,
    redFlags,
    presentation: { unlocked: reasons.length === 0, reasons },
    nextStage: NEXT_STAGE[deal.stage] ?? null,
  };
}

export const READINESS_LABEL: Record<Readiness, string> = {
  ready: "Ready",
  caution: "Proceed with caution",
  missing: "Missing critical evidence",
};

// ---------------------------------------------------------------------------
// Evidence Rail (design §6): what we know, how we know it, what's missing.
// ---------------------------------------------------------------------------

export type RailState = "confirmed" | "partial" | "missing";
export type RailItem = { key: string; label: string; state: RailState; value: string; note: string };

export function evidenceRail(e: DealEvidence, currency = "USD"): RailItem[] {
  const money = (n: number | null) =>
    n === null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const anyConfirmed = (xs: { source: string }[]) => xs.some((x) => x.source === "buyer-confirmed");
  const csItems = [...e.current_state.facts, ...e.current_state.metrics];
  const current = [...e.current_state.metrics.map((m) => `${m.label}: ${m.value}`), ...e.current_state.facts.map((f) => f.text)];
  const desired = [...e.desired_state.metrics.map((m) => `${m.label}: ${m.value}`), ...e.desired_state.facts.map((f) => f.text)];
  const econ = e.stakeholders.find((s) => s.role === "economic_buyer");
  const efficacy = e.buying_beliefs.self_efficacy?.score;
  const hasEfficacy = efficacy !== null && efficacy !== undefined;

  return [
    {
      key: "fit",
      label: "ICP fit",
      state: e.account_fit.reason ? (e.account_fit.status === "confirmed" ? "confirmed" : "partial") : "missing",
      value: e.account_fit.reason || "Missing",
      note: e.account_fit.reason ? (e.account_fit.status === "confirmed" ? "Confirmed" : "Hypothesis") : "Why this account, why now?",
    },
    {
      key: "current",
      label: "Current problem",
      state: !current.length ? "missing" : anyConfirmed(csItems) && current.length >= 2 ? "confirmed" : "partial",
      value: current[0] ?? "Missing",
      note: current.length
        ? `${current.length} fact${current.length === 1 ? "" : "s"} · ${anyConfirmed(csItems) ? "buyer confirmed" : "not buyer-confirmed"}`
        : "Quantify how things work today",
    },
    {
      key: "desired",
      label: "Desired outcome",
      state: !desired.length ? "missing" : e.desired_state.target_date && e.desired_state.metrics.length ? "confirmed" : "partial",
      value: desired[0] ?? "Missing",
      note: e.desired_state.target_date ? `By ${e.desired_state.target_date}` : desired.length ? "No target date" : "Measurable target and date",
    },
    {
      key: "value",
      label: "Value",
      state: e.value_gap.amount ? (e.value_gap.buyer_confirmed ? "confirmed" : "partial") : "missing",
      value: e.value_gap.amount ? `${money(e.value_gap.amount)} / ${e.value_gap.cadence === "monthly" ? "mo" : "yr"} gap` : "Missing",
      note: e.value_gap.amount ? (e.value_gap.buyer_confirmed ? "Buyer confirmed" : "Estimate · not buyer-confirmed") : "Price will be judged in a vacuum",
    },
    {
      key: "coi",
      label: "Cost of inaction",
      state: e.cost_of_inaction.amount ? (e.cost_of_inaction.confidence === "buyer-confirmed" ? "confirmed" : "partial") : "missing",
      value: e.cost_of_inaction.amount ? `${money(e.cost_of_inaction.amount)} / mo` : "Missing",
      note: e.cost_of_inaction.amount ? (e.cost_of_inaction.confidence === "buyer-confirmed" ? "Buyer confirmed" : "Estimate") : "Without it, delay looks free",
    },
    {
      key: "roadblock",
      label: "Roadblock",
      state: !e.roadblocks.length ? "missing" : anyConfirmed(e.roadblocks) ? "confirmed" : "partial",
      value: e.roadblocks[0]?.text ?? "Missing",
      note: e.roadblocks.length ? (anyConfirmed(e.roadblocks) ? "Buyer stated" : "Hypothesis") : "Why isn't it solved already?",
    },
    {
      key: "stakeholders",
      label: "Stakeholders",
      state: !e.stakeholders.length ? "missing" : econ && e.stakeholders.length >= 2 ? "confirmed" : "partial",
      value: e.stakeholders.length
        ? e.stakeholders
            .map((s) => s.name || s.title)
            .filter(Boolean)
            .slice(0, 3)
            .join(", ")
        : "Missing",
      note: econ ? `Economic buyer: ${econ.name || econ.title}` : e.stakeholders.length ? "Economic buyer unknown" : "Who is involved?",
    },
    {
      key: "decision",
      label: "Decision process",
      state:
        !e.decision_process.people.length && !e.decision_process.date
          ? "missing"
          : e.decision_process.people.length && e.decision_process.date
            ? "confirmed"
            : "partial",
      value: e.decision_process.date
        ? `Decision by ${e.decision_process.date}`
        : e.decision_process.people.length
          ? e.decision_process.people.join(", ")
          : "Missing",
      note: e.decision_process.procurement || (e.decision_process.people.length ? "Procurement path unknown" : "Who signs, and how?"),
    },
    {
      key: "implementation",
      label: "Implementation",
      state: !hasEfficacy ? "missing" : efficacy >= 7 ? "confirmed" : "partial",
      value: hasEfficacy ? `Confidence ${efficacy}/10` : "Missing",
      note: e.buying_beliefs.self_efficacy?.evidence || "Can their team adopt it?",
    },
    {
      key: "next",
      label: "Next step",
      state: e.next_step.purpose && e.next_step.date && e.next_step.owner ? (isPast(e.next_step.date) ? "partial" : "confirmed") : "missing",
      value: e.next_step.purpose || "Missing",
      note: e.next_step.date
        ? `${e.next_step.owner ?? "Owner?"} · ${e.next_step.date}${isPast(e.next_step.date) ? " · overdue" : ""}`
        : "Owner, date, purpose",
    },
  ];
}

// ---------------------------------------------------------------------------
// Opportunity health by component (design §24): explainable, never one opaque score.
// ---------------------------------------------------------------------------

export type HealthComponent = { key: string; label: string; score: number; have: string[]; missing: string[] };

function component(key: string, label: string, rules: [boolean, number, string][]): HealthComponent {
  return {
    key,
    label,
    score: Math.min(100, rules.reduce((t, [ok, pts]) => t + (ok ? pts : 0), 0)),
    have: rules.filter(([ok]) => ok).map(([, , l]) => l),
    missing: rules.filter(([ok]) => !ok).map(([, , l]) => l),
  };
}

export function componentHealth(e: DealEvidence): HealthComponent[] {
  const cs = [...e.current_state.facts, ...e.current_state.metrics];
  const roles = new Set(e.stakeholders.map((s) => s.role));
  const efficacy = e.buying_beliefs.self_efficacy?.score ?? 0;
  return [
    component("fit", "ICP fit", [
      [!!e.account_fit.reason, 60, "Fit reason recorded"],
      [e.account_fit.status === "confirmed", 40, "Fit confirmed"],
    ]),
    component("problem", "Problem", [
      [cs.length >= 1, 30, "Current state described"],
      [cs.length >= 2, 20, "Two or more facts or metrics"],
      [cs.some((x) => x.source === "buyer-confirmed"), 20, "Buyer-confirmed facts"],
      [e.roadblocks.some((r) => r.source === "buyer-confirmed"), 30, "Buyer-stated roadblock"],
    ]),
    component("value", "Value", [
      [(e.value_gap.amount ?? 0) > 0, 40, "Gap quantified"],
      [e.value_gap.buyer_confirmed, 30, "Gap buyer-confirmed"],
      [(e.cost_of_inaction.amount ?? 0) > 0, 20, "Cost of inaction recorded"],
      [e.cost_of_inaction.confidence === "buyer-confirmed", 10, "Cost of inaction confirmed"],
    ]),
    component("stakeholders", "Stakeholders", [
      [e.stakeholders.length >= 1, 30, "At least one stakeholder"],
      [e.stakeholders.length >= 2, 20, "Multi-threaded"],
      [roles.has("economic_buyer"), 30, "Economic buyer identified"],
      [roles.has("champion") || e.stakeholders.some((s) => s.stance === "champion"), 20, "Champion identified"],
    ]),
    component("decision", "Decision process", [
      [e.decision_process.people.length > 0, 30, "People involved known"],
      [!!e.decision_process.date, 30, "Decision date known"],
      [e.decision_process.criteria.length > 0, 20, "Decision criteria known"],
      [!!e.decision_process.procurement, 20, "Procurement path known"],
    ]),
    component("implementation", "Implementation", [
      [efficacy >= 5, 30, "Adoption capacity discussed"],
      [efficacy >= 8, 30, "Strong implementation confidence"],
      [e.commitments.some((c) => c.owner && c.due), 40, "Owned, dated commitments"],
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Next Best Action (design §8): WHAT → WHY → ACTION, always with a rationale.
// ---------------------------------------------------------------------------

export type NextAction = { what: string; why: string; cta: string; kind: "ask" | "record" | "advance" | "close" };

const ACTION_FOR: Record<string, { what: string; kind: NextAction["kind"] }> = {
  fit: { what: "Record why this account fits the ICP and why now.", kind: "record" },
  next_step: { what: "Agree a specific next step: owner, date and purpose.", kind: "ask" },
  current_state: { what: "Quantify how things work today on the next call.", kind: "ask" },
  desired_state: { what: "Ask where the key metric needs to be, and by when.", kind: "ask" },
  roadblock: { what: "Ask why this hasn't been solved internally yet.", kind: "ask" },
  prior_attempts: { what: "Ask what they've already tried and what happened.", kind: "ask" },
  stakeholders: { what: "Map who else is involved in this decision.", kind: "ask" },
  gap: { what: "Calculate the value gap with the buyer and ask them to confirm it.", kind: "ask" },
  cost_of_inaction: { what: "Ask what two more quarters of the status quo would cost.", kind: "ask" },
  decision_process: { what: "Ask about the approval path before sending a proposal.", kind: "ask" },
  economic_buyer: { what: "Identify the economic buyer and get them involved.", kind: "ask" },
  gap_vs_price: { what: "Strengthen the value case before discussing price.", kind: "ask" },
  beliefs: { what: "Test the weakest buying belief on the next call.", kind: "ask" },
  mutual_plan: { what: "Draft a mutual action plan with owners on both sides.", kind: "record" },
  multi_threaded: { what: "Bring a second stakeholder into the conversation.", kind: "ask" },
};

export function nextActionFor(health: DealHealth, stage: DealStage): NextAction {
  if (["won", "lost", "nurture"].includes(stage)) {
    return {
      what: stage === "won" ? "Hand off goals, promises and risks to delivery." : "Feed the outcome back into the Sales Foundation.",
      why: "Closed deals are where the playbook learns.",
      cta: "Open close checklist",
      kind: "close",
    };
  }
  const failing = [...health.checks.filter((c) => c.critical && !c.ok), ...health.checks.filter((c) => !c.critical && !c.ok)][0];
  if (!failing) {
    return {
      what: `Advance to ${health.nextStage ? STAGE_LABEL[health.nextStage] : "the next stage"}.`,
      why: "Every exit criterion for this stage is backed by evidence.",
      cta: "Advance",
      kind: "advance",
    };
  }
  const a = ACTION_FOR[failing.key] ?? { what: failing.label, kind: "record" as const };
  return { what: a.what, why: failing.detail, cta: a.kind === "ask" ? "Prepare question" : "Update evidence", kind: a.kind };
}

export const STAGE_LABEL: Record<DealStage, string> = Object.fromEntries(DEAL_STAGES.map((s) => [s.key, s.label])) as Record<DealStage, string>;
