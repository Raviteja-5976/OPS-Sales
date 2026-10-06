// Lenient schemas: every field has a fallback so a slightly-off model response degrades
// gracefully instead of failing the whole request.
import { z } from "zod";
import { BELIEF_KEYS, SOURCE_LABELS } from "../types";

export const S = () => z.string().catch("");
export const SN = () => z.string().nullable().catch(null);
export const A = <T extends z.ZodTypeAny>(t: T) => z.array(t).catch([]);
export const N = () =>
  z
    .preprocess((v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") return v;
      const n = Number(String(v).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }, z.number().nullable())
    .catch(null);
export const O = <T extends z.ZodRawShape>(shape: T) => {
  const o = z.object(shape);
  return o.catch(() => o.parse({}));
};

export const source = () => z.enum(SOURCE_LABELS as [string, ...string[]]).catch("ai-hypothesis");
export const claim = O({ text: S(), source: source() });
export const claims = A(claim);
export const strs = A(z.string());

// ---- Foundation -----------------------------------------------------------

export const interviewSchema = O({
  questions: A(O({ question: S(), why: S() })),
});

export const positioningSchema = O({
  one_liner: claim,
  positioning_statement: claim,
  category_framing: claim,
  narrative: O({ problem: claim, mechanism: claim, outcome: claim }),
  differentiators: claims,
  alternatives: A(O({ name: S(), type: S(), how_we_differ: claim })),
});

export const marketSchema = O({
  icp: O({ firmographics: claims, buying_triggers: claims, disqualifiers: claims }),
  account_tiers: A(O({ tier: N(), definition: S(), research_depth: S() })),
  buyer_committee: A(O({ role: S(), cares_about: claims, pains: claims })),
});

export const offerSchema = O({
  outcomes: claims,
  proof_inventory: claims,
  evidence_gaps: strs,
  core_package: O({ name: S(), scope: strs, onboarding: S() }),
  add_ons: strs,
  pricing_hypotheses: claims,
  guarantees: claims,
});

export const motionSchema = O({
  objections: A(O({ objection: S(), missing_belief: S(), evidence_needed: S(), response_pattern: S() })),
  pipeline_stages: A(O({ stage: S(), exit_criteria: strs })),
  qualification_criteria: strs,
  metrics: strs,
  claims_allowed: strs,
  claims_require_verification: strs,
});

// ---- Plan -------------------------------------------------------------------

export const planSchema = O({
  summary: S(),
  segments: A(O({ name: S(), triggers: strs, why: S() })),
  account_tiers: A(O({ tier: N(), definition: S(), research_depth: S() })),
  channel_mix: A(O({ channel: S(), share: S(), notes: S() })),
  campaigns: A(
    O({ theme: S(), segment: S(), problem_hypothesis: S(), proof: S(), offer: S(), cta: S(), stop_conditions: S() }),
  ),
  phases: A(O({ label: S(), goals: strs, actions: strs, exit_metrics: strs })),
  weekly_capacity: A(O({ owner: S(), activity: S(), per_week: S() })),
  leading_metrics: strs,
  review_cadence: strs,
  experiments: A(O({ hypothesis: S(), test: S(), success_criteria: S() })),
  risks: A(O({ risk: S(), mitigation: S() })),
  assumptions: strs,
});

// ---- Accounts & outreach ------------------------------------------------------

export const briefSchema = O({
  fit_summary: S(),
  fit_reasons: claims,
  signals: A(O({ text: S(), url: S(), date: S(), relevance: S() })),
  hypotheses: strs,
  buyer_roles: A(O({ role: S(), why: S(), likely_concerns: strs })),
  relevant_proof: strs,
  outreach_angle: S(),
  disqualification_risk: SN(),
  open_questions: strs,
});

export const sequenceSchema = O({
  rationale: S(),
  opening_basis: O({
    kind: z.enum(["cited_signal", "role_hypothesis"]).catch("role_hypothesis"),
    text: S(),
    source: S(),
  }),
  steps: A(
    O({
      day: N(),
      channel: z.enum(["email", "phone", "linkedin", "voicemail"]).catch("email"),
      subject: S(),
      body: S(),
      reason_to_respond: S(),
      stop_if: S(),
    }),
  ),
  call_opener: S(),
  voicemail: S(),
  linkedin_note: S(),
  reply_branches: A(O({ if_reply: S(), respond_with: S() })),
  stop_conditions: strs,
  variants: A(O({ label: S(), intent: S(), subject: S(), body: S() })),
});

export const outreachReviewSchema = O({
  issues: A(
    O({
      severity: z.enum(["fail", "warn"]).catch("warn"),
      area: S(),
      issue: S(),
      fix: S(),
    }),
  ),
  overall: S(),
});

// ---- Calls -----------------------------------------------------------------------

export const prepSchema = O({
  why_account: S(),
  why_role: S(),
  why_now: S(),
  opener: S(),
  relevance_statement: S(),
  proof_point: S(),
  honest_non_fit: S(),
  discovery_objective: S(),
  questions: A(O({ stage: N(), question: S(), fills: S() })),
  previous_context: strs,
  respectful_exit: S(),
  follow_up_option: S(),
});

export const nextQuestionSchema = O({
  question: S(),
  why: S(),
  fills: S(),
  listen_for: strs,
  suggested_stage: N(),
});

export const objectionSchema = O({
  cushion: S(),
  isolate: S(),
  likely_missing_belief: S(),
  upstream_origin: S(),
  diagnosis: S(),
  suggested_question: S(),
  return_to_stage: N(),
  avoid: strs,
});

const beliefShape: Record<string, z.ZodTypeAny> = {};
for (const k of BELIEF_KEYS) beliefShape[k] = O({ score: N(), evidence: S() });

const factsSchema = A(O({ text: S(), source: source() }));
const metricsSchema = A(O({ label: S(), value: S(), source: source() }));

export const evidenceUpdateSchema = O({
  account_fit: O({ status: z.enum(["hypothesis", "confirmed"]).catch("hypothesis"), reason: S() }),
  stakeholders: A(
    O({
      name: S(),
      title: S(),
      role: z
        .enum(["economic_buyer", "champion", "end_user", "technical_evaluator", "procurement", "influencer", "unknown"])
        .catch("unknown"),
      stance: z.enum(["champion", "supporter", "neutral", "blocker", "unknown"]).catch("unknown"),
      source: source(),
    }),
  ),
  current_state: O({ facts: factsSchema, metrics: metricsSchema }),
  desired_state: O({ facts: factsSchema, metrics: metricsSchema, target_date: SN() }),
  value_gap: O({
    amount: N(),
    cadence: z.enum(["monthly", "annual"]).catch("monthly"),
    assumptions: strs,
    buyer_confirmed: z.boolean().catch(false),
  }),
  roadblocks: factsSchema,
  prior_attempts: factsSchema,
  cost_of_inaction: O({
    amount: N(),
    cadence: z.literal("monthly").catch("monthly"),
    confidence: z.enum(["estimate", "buyer-confirmed"]).catch("estimate"),
  }),
  buying_beliefs: O(beliefShape),
  decision_process: O({ criteria: strs, people: strs, date: SN(), procurement: S() }),
});

export const reviewSchema = O({
  summary: S(),
  evidence_updates: evidenceUpdateSchema,
  missing_evidence: strs,
  next_step: O({ owner: SN(), date: SN(), purpose: SN() }),
  commitments: A(O({ text: S(), owner: S(), due: SN(), done: z.boolean().catch(false) })),
  recap_email: O({ subject: S(), body: S() }),
  coaching: O({ strengths: strs, improvements: strs, stage_skipped: strs }),
  objections: A(O({ text: S(), origin_stage: S(), missing_belief: S() })),
});

// ---- Deals ---------------------------------------------------------------------------

export const diagnosisSchema = O({
  summary: S(),
  next_best_action: O({ action: S(), why: S() }),
  weakest_beliefs: A(O({ belief: S(), why: S(), question: S() })),
  risks: strs,
  questions_for_next_call: strs,
});

export const proposalSchema = O({
  executive_summary: S(),
  value_case: O({ baseline: S(), target: S(), gap: S(), cost_of_delay: S(), assumptions: strs }),
  solution_map: A(O({ roadblock: S(), solution_element: S(), proof: S() })),
  scope: strs,
  exclusions: strs,
  options: A(O({ name: S(), description: S(), price_note: S() })),
  implementation_plan: A(O({ phase: S(), owner: S(), timing: S() })),
  mutual_action_plan: A(O({ step: S(), owner: S(), date: S() })),
  open_risks: strs,
  unverified_claims: strs,
});
