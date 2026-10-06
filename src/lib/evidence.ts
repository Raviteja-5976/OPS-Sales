import { BELIEF_KEYS, type DealEvidence, type BeliefKey } from "./types";

export function emptyEvidence(): DealEvidence {
  return {
    account_fit: { status: "hypothesis", reason: "" },
    stakeholders: [],
    current_state: { facts: [], metrics: [] },
    desired_state: { facts: [], metrics: [], target_date: null },
    value_gap: { amount: null, cadence: "monthly", assumptions: [], buyer_confirmed: false },
    roadblocks: [],
    prior_attempts: [],
    cost_of_inaction: { amount: null, cadence: "monthly", confidence: "estimate" },
    buying_beliefs: Object.fromEntries(BELIEF_KEYS.map((k) => [k, { score: null, evidence: "" }])) as Record<
      BeliefKey,
      { score: number | null; evidence: string }
    >,
    decision_process: { criteria: [], people: [], date: null, procurement: "" },
    objections: [],
    commitments: [],
    next_step: { owner: null, date: null, purpose: null },
    evidence_sources: [],
  };
}

/** Fill any missing keys so UI and rules can rely on the full shape. */
export function normalizeEvidence(raw: unknown): DealEvidence {
  const base = emptyEvidence();
  const e = (raw && typeof raw === "object" ? raw : {}) as Partial<DealEvidence>;
  return {
    account_fit: { ...base.account_fit, ...(e.account_fit ?? {}) },
    stakeholders: Array.isArray(e.stakeholders) ? e.stakeholders : [],
    current_state: {
      facts: e.current_state?.facts ?? [],
      metrics: e.current_state?.metrics ?? [],
    },
    desired_state: {
      facts: e.desired_state?.facts ?? [],
      metrics: e.desired_state?.metrics ?? [],
      target_date: e.desired_state?.target_date ?? null,
    },
    value_gap: { ...base.value_gap, ...(e.value_gap ?? {}) },
    roadblocks: e.roadblocks ?? [],
    prior_attempts: e.prior_attempts ?? [],
    cost_of_inaction: { ...base.cost_of_inaction, ...(e.cost_of_inaction ?? {}) },
    buying_beliefs: Object.fromEntries(
      BELIEF_KEYS.map((k) => [k, { ...base.buying_beliefs[k], ...(e.buying_beliefs?.[k] ?? {}) }]),
    ) as DealEvidence["buying_beliefs"],
    decision_process: { ...base.decision_process, ...(e.decision_process ?? {}) },
    objections: e.objections ?? [],
    commitments: e.commitments ?? [],
    next_step: { ...base.next_step, ...(e.next_step ?? {}) },
    evidence_sources: e.evidence_sources ?? [],
  };
}

/**
 * Merge AI-extracted updates into an existing record. Lists are appended with de-duplication
 * on text; scalars are only overwritten when the update carries a value. Nothing is removed,
 * so the AI can never silently delete seller-entered truth.
 */
export function mergeEvidence(current: DealEvidence, update: Partial<DealEvidence>): DealEvidence {
  const u = update ?? {};
  const appendBy = <T,>(a: T[], b: T[] | undefined, key: (x: T) => string) => {
    const seen = new Set(a.map((x) => key(x).trim().toLowerCase()));
    const out = [...a];
    for (const item of b ?? []) {
      const k = key(item).trim().toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(item);
      }
    }
    return out;
  };
  const byText = (x: { text: string }) => x.text ?? "";
  const pick = <T,>(next: T | null | undefined, prev: T) =>
    next === null || next === undefined || (next as unknown) === "" ? prev : next;

  const beliefs = { ...current.buying_beliefs };
  for (const k of BELIEF_KEYS) {
    const nb = u.buying_beliefs?.[k];
    if (nb && typeof nb.score === "number") {
      beliefs[k] = { score: nb.score, evidence: nb.evidence || beliefs[k].evidence };
    }
  }

  return {
    account_fit: {
      status: pick(u.account_fit?.status, current.account_fit.status),
      reason: pick(u.account_fit?.reason, current.account_fit.reason),
    },
    stakeholders: appendBy(current.stakeholders, u.stakeholders, (s) => s.name ?? ""),
    current_state: {
      facts: appendBy(current.current_state.facts, u.current_state?.facts, byText),
      metrics: appendBy(current.current_state.metrics, u.current_state?.metrics, (m) => `${m.label}:${m.value}`),
    },
    desired_state: {
      facts: appendBy(current.desired_state.facts, u.desired_state?.facts, byText),
      metrics: appendBy(current.desired_state.metrics, u.desired_state?.metrics, (m) => `${m.label}:${m.value}`),
      target_date: pick(u.desired_state?.target_date, current.desired_state.target_date),
    },
    value_gap: {
      amount: pick(u.value_gap?.amount, current.value_gap.amount),
      cadence: pick(u.value_gap?.cadence, current.value_gap.cadence),
      assumptions: appendBy(current.value_gap.assumptions, u.value_gap?.assumptions, (s) => s),
      buyer_confirmed: u.value_gap?.buyer_confirmed ?? current.value_gap.buyer_confirmed,
    },
    roadblocks: appendBy(current.roadblocks, u.roadblocks, byText),
    prior_attempts: appendBy(current.prior_attempts, u.prior_attempts, byText),
    cost_of_inaction: {
      amount: pick(u.cost_of_inaction?.amount, current.cost_of_inaction.amount),
      cadence: "monthly",
      confidence: pick(u.cost_of_inaction?.confidence, current.cost_of_inaction.confidence),
    },
    buying_beliefs: beliefs,
    decision_process: {
      criteria: appendBy(current.decision_process.criteria, u.decision_process?.criteria, (s) => s),
      people: appendBy(current.decision_process.people, u.decision_process?.people, (s) => s),
      date: pick(u.decision_process?.date, current.decision_process.date),
      procurement: pick(u.decision_process?.procurement, current.decision_process.procurement),
    },
    objections: appendBy(current.objections, u.objections, byText),
    commitments: appendBy(current.commitments, u.commitments, byText),
    next_step: {
      owner: pick(u.next_step?.owner, current.next_step.owner),
      date: pick(u.next_step?.date, current.next_step.date),
      purpose: pick(u.next_step?.purpose, current.next_step.purpose),
    },
    evidence_sources: [...current.evidence_sources, ...(u.evidence_sources ?? [])],
  };
}
