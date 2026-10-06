// Domain types shared by server and client code.

export type Role = "owner" | "manager" | "rep";

export type SourceLabel = "company-provided" | "public-research" | "ai-hypothesis" | "buyer-confirmed";
export const SOURCE_LABELS: SourceLabel[] = ["company-provided", "public-research", "ai-hypothesis", "buyer-confirmed"];

export type Org = {
  id: string;
  name: string;
  website: string | null;
  settings: OrgSettings;
  created_at: string;
};

export type OrgSettings = {
  inbound_sla_minutes?: number;
  max_touches_per_week?: number;
  send_window_start?: string;
  send_window_end?: string;
  require_unsubscribe?: boolean;
  prohibited_phrases?: string[];
  sender_identity?: string;
};

export type Member = {
  org_id: string;
  user_id: string;
  role: Role;
  email: string | null;
  full_name: string | null;
};

export type ProductIntake = {
  problem?: string;
  outcomes?: string;
  mechanism?: string;
  ideal_customers?: string;
  industries?: string;
  company_size?: string;
  buyer_roles?: string;
  exclusions?: string;
  geography?: string;
  pricing?: string;
  delivery_model?: string;
  capacity?: string;
  sales_cycle?: string;
  differentiators?: string;
  competitors?: string;
  objections?: string;
  proof?: string;
  collateral?: string;
  interview?: { question: string; why?: string; answer: string }[];
};

export type Product = {
  id: string;
  org_id: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  website: string | null;
  intake: ProductIntake;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type Claim = { text: string; source: SourceLabel };

export type FoundationContent = {
  positioning?: {
    one_liner?: Claim;
    positioning_statement?: Claim;
    category_framing?: Claim;
    narrative?: { problem: Claim; mechanism: Claim; outcome: Claim };
    differentiators?: Claim[];
    alternatives?: { name: string; type: string; how_we_differ: Claim }[];
  };
  market?: {
    icp?: { firmographics: Claim[]; buying_triggers: Claim[]; disqualifiers: Claim[] };
    account_tiers?: { tier: number; definition: string; research_depth: string }[];
    buyer_committee?: { role: string; cares_about: Claim[]; pains: Claim[] }[];
  };
  offer?: {
    outcomes?: Claim[];
    proof_inventory?: Claim[];
    evidence_gaps?: string[];
    core_package?: { name: string; scope: string[]; onboarding: string };
    add_ons?: string[];
    pricing_hypotheses?: Claim[];
    guarantees?: Claim[];
  };
  motion?: {
    objections?: { objection: string; missing_belief: string; evidence_needed: string; response_pattern: string }[];
    pipeline_stages?: { stage: string; exit_criteria: string[] }[];
    qualification_criteria?: string[];
    metrics?: string[];
    claims_allowed?: string[];
    claims_require_verification?: string[];
  };
};

export type Foundation = {
  id: string;
  org_id: string;
  product_id: string;
  version: number;
  status: "draft" | "approved" | "archived";
  content: FoundationContent;
  approved_at: string | null;
  created_at: string;
};

export type ProofItem = {
  id: string;
  product_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  source_label: SourceLabel;
  source_url: string | null;
  approved_for_outreach: boolean;
};

export type AccountSignal = { text: string; url?: string; date?: string };

export type Account = {
  id: string;
  org_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employee_count: string | null;
  geography: string | null;
  tier: number;
  status: "target" | "engaged" | "customer" | "nurture" | "disqualified";
  fit_reason: string | null;
  why_now: string | null;
  disqualify_reason: string | null;
  notes: string | null;
  signals: AccountSignal[];
  research_brief: AccountBrief | null;
  created_at: string;
};

export type AccountBrief = {
  product_id?: string;
  fit_summary: string;
  fit_reasons: Claim[];
  signals: { text: string; url?: string; date?: string; relevance: string }[];
  hypotheses: string[];
  buyer_roles: { role: string; why: string; likely_concerns: string[] }[];
  relevant_proof: string[];
  outreach_angle: string;
  disqualification_risk: string | null;
  open_questions: string[];
  generated_at?: string;
};

export type BuyingRole =
  | "economic_buyer"
  | "champion"
  | "end_user"
  | "technical_evaluator"
  | "procurement"
  | "influencer"
  | "unknown";

export type Contact = {
  id: string;
  account_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  buying_role: BuyingRole;
  jurisdiction: string | null;
  contact_source: string | null;
  outreach_basis: "consent" | "legitimate_interest" | "existing_relationship" | "unverified";
  opted_out: boolean;
};

export type SequenceStep = {
  day: number;
  channel: "email" | "phone" | "linkedin" | "voicemail";
  subject?: string;
  body: string;
  reason_to_respond: string;
  stop_if: string;
};

export type SequenceContent = {
  rationale: string;
  opening_basis: { kind: "cited_signal" | "role_hypothesis"; text: string; source?: string };
  steps: SequenceStep[];
  call_opener: string;
  voicemail: string;
  linkedin_note: string;
  reply_branches: { if_reply: string; respond_with: string }[];
  stop_conditions: string[];
  variants?: { label: string; intent: string; subject: string; body: string }[];
};

export type CheckResult = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type Sequence = {
  id: string;
  product_id: string;
  account_id: string;
  contact_id: string | null;
  objective: "permission" | "relevance" | "meeting" | "re-engagement";
  angle: string | null;
  status: "draft" | "approved" | "rejected" | "active" | "stopped" | "completed";
  content: SequenceContent;
  checks: CheckResult[];
  approved_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Deal Evidence Record
// ---------------------------------------------------------------------------

export type Fact = { text: string; source: SourceLabel };
export type Metric = { label: string; value: string; source: SourceLabel };

export const BELIEF_KEYS = [
  "pain",
  "goal",
  "roadblock",
  "vehicle",
  "provider",
  "self_efficacy",
  "urgency",
] as const;
export type BeliefKey = (typeof BELIEF_KEYS)[number];

export const BELIEFS: Record<BeliefKey, { label: string; conviction: string; question: string; ifMissing: string }> = {
  pain: {
    label: "Current pain",
    conviction: "The status quo is producing real, ongoing friction or loss.",
    question: "What is happening today that makes keeping things as they are hard to accept?",
    ifMissing: "Apathy, inaction, or cancelled follow-ups.",
  },
  goal: {
    label: "Target goal",
    conviction: "There is an explicit, measurable target and a date.",
    question: "Where does this metric realistically need to be in 12 months?",
    ifMissing: "No measurable gap, so no basis for value.",
  },
  roadblock: {
    label: "Internal roadblock",
    conviction: "Current people, tools or methods have not closed the gap — and why.",
    question: "Given this has been a goal for a while, what has kept it from being solved internally?",
    ifMissing: "\"We'll build it in-house.\"",
  },
  vehicle: {
    label: "Strategic approach",
    conviction: "The proposed approach is a sound way to remove the roadblock.",
    question: "Does this approach look mechanically sound for how your team works?",
    ifMissing: "Buyer evaluates other approaches or categories.",
  },
  provider: {
    label: "Trust in provider",
    conviction: "This provider can credibly deliver, backed by proof.",
    question: "Do you have any reservations about our proof, team, or delivery?",
    ifMissing: "Shopping the approach against cheaper providers.",
  },
  self_efficacy: {
    label: "Implementation confidence",
    conviction: "The buyer's team has the capacity to adopt and succeed.",
    question: "Looking at your team's capacity, what would make adoption hard?",
    ifMissing: "Fear of failing to implement; stalls after verbal yes.",
  },
  urgency: {
    label: "Legitimate timing",
    conviction: "Delay has a real, quantified cost; this is a priority now.",
    question: "Why does solving this matter this quarter rather than next year?",
    ifMissing: "\"Reach out next quarter.\"",
  },
};

export type Stakeholder = {
  name: string;
  title: string;
  role: BuyingRole;
  stance: "champion" | "supporter" | "neutral" | "blocker" | "unknown";
  source: SourceLabel;
};

export type Objection = {
  text: string;
  category: string;
  origin_stage: string;
  missing_belief?: BeliefKey | "";
  status: "open" | "resolved";
  at: string;
};

export type Commitment = { text: string; owner: string; due: string | null; done: boolean };

export type DealEvidence = {
  account_fit: { status: "hypothesis" | "confirmed"; reason: string };
  stakeholders: Stakeholder[];
  current_state: { facts: Fact[]; metrics: Metric[] };
  desired_state: { facts: Fact[]; metrics: Metric[]; target_date: string | null };
  value_gap: {
    amount: number | null;
    cadence: "monthly" | "annual";
    assumptions: string[];
    buyer_confirmed: boolean;
  };
  roadblocks: Fact[];
  prior_attempts: Fact[];
  cost_of_inaction: { amount: number | null; cadence: "monthly"; confidence: "estimate" | "buyer-confirmed" };
  buying_beliefs: Record<BeliefKey, { score: number | null; evidence: string }>;
  decision_process: { criteria: string[]; people: string[]; date: string | null; procurement: string };
  objections: Objection[];
  commitments: Commitment[];
  next_step: { owner: string | null; date: string | null; purpose: string | null };
  evidence_sources: { kind: "call" | "email" | "note"; ref: string; date: string }[];
};

export type DealStage = "prospecting" | "discovery" | "qualified" | "proposal" | "commit" | "won" | "lost" | "nurture";

export const DEAL_STAGES: { key: DealStage; label: string; open: boolean }[] = [
  // Evidence journey (design §7): each stage names the evidence it must establish.
  { key: "prospecting", label: "Fit", open: true },
  { key: "discovery", label: "Problem", open: true },
  { key: "qualified", label: "Value", open: true },
  { key: "proposal", label: "Decision", open: true },
  { key: "commit", label: "Close", open: true },
  { key: "won", label: "Won", open: false },
  { key: "lost", label: "Lost", open: false },
  { key: "nurture", label: "Nurture", open: false },
];

export type Deal = {
  id: string;
  org_id: string;
  product_id: string;
  account_id: string;
  name: string;
  stage: DealStage;
  amount: number | null;
  currency: string;
  close_date: string | null;
  evidence: DealEvidence;
  proposal: ProposalDraft | null;
  ai_diagnosis: DealDiagnosis | null;
  outcome_reason: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalDraft = {
  executive_summary: string;
  value_case: { baseline: string; target: string; gap: string; cost_of_delay: string; assumptions: string[] };
  solution_map: { roadblock: string; solution_element: string; proof: string }[];
  scope: string[];
  exclusions: string[];
  options: { name: string; description: string; price_note: string }[];
  implementation_plan: { phase: string; owner: string; timing: string }[];
  mutual_action_plan: { step: string; owner: string; date: string }[];
  open_risks: string[];
  unverified_claims: string[];
};

export type DealDiagnosis = {
  summary: string;
  next_best_action: { action: string; why: string };
  weakest_beliefs: { belief: BeliefKey; why: string; question: string }[];
  risks: string[];
  questions_for_next_call: string[];
  generated_at?: string;
};

export type LiveNote = { at: string; stage: number; kind: string; text: string };

export type CallPrep = {
  why_account: string;
  why_role: string;
  why_now: string;
  opener: string;
  relevance_statement: string;
  proof_point: string;
  honest_non_fit: string;
  discovery_objective: string;
  questions: { stage: number; question: string; fills: string }[];
  previous_context: string[];
  respectful_exit: string;
  follow_up_option: string;
};

export type CallReview = {
  summary: string;
  evidence_updates: Partial<DealEvidence>;
  missing_evidence: string[];
  next_step: { owner: string | null; date: string | null; purpose: string | null };
  commitments: Commitment[];
  recap_email: { subject: string; body: string };
  coaching: { strengths: string[]; improvements: string[]; stage_skipped: string[] };
  objections: { text: string; origin_stage: string; missing_belief: string }[];
  generated_at?: string;
};

export type Call = {
  id: string;
  deal_id: string | null;
  account_id: string;
  contact_id: string | null;
  product_id: string;
  title: string;
  kind: "cold_call" | "discovery" | "follow_up" | "proposal" | "other";
  scheduled_at: string | null;
  status: "planned" | "live" | "completed" | "cancelled";
  objective: string | null;
  prep_brief: CallPrep | null;
  live_notes: LiveNote[];
  current_stage: number;
  notes: string | null;
  transcript: string | null;
  review: CallReview | null;
  consent_to_record: boolean;
  owner_id: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  deal_id: string | null;
  account_id: string | null;
  title: string;
  owner_label: string | null;
  due_date: string | null;
  done: boolean;
  source: string;
};

export type ChecklistItem = {
  id: string;
  section?: string;
  text: string;
  why?: string;
  required: boolean;
  ai_action?: "draft" | "calculate" | "research" | "coach" | "summarize";
  mode?: "prepare" | "live" | "review";
};

export type ChecklistTemplate = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: "product" | "plan" | "account" | "call" | "deal";
  items: ChecklistItem[];
  built_in: boolean;
};

export type ChecklistItemState = {
  done?: boolean;
  note?: string;
  overridden?: boolean;
  override_reason?: string;
  at?: string;
};

export type ChecklistRun = {
  id: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  state: Record<string, ChecklistItemState>;
};

export type SalesPlanInputs = {
  revenue_target: number;
  period_months: number;
  acv: number;
  win_rate: number; // % of qualified opps that close
  meeting_to_opp: number; // % of first meetings that become qualified opps
  account_to_meeting: number; // % of worked target accounts that book a meeting
  sales_cycle_days: number;
  sellers: number;
  touches_per_account: number;
};

export type SalesPlanContent = {
  summary: string;
  segments: { name: string; triggers: string[]; why: string }[];
  account_tiers: { tier: number; definition: string; research_depth: string }[];
  channel_mix: { channel: string; share: string; notes: string }[];
  campaigns: { theme: string; segment: string; problem_hypothesis: string; proof: string; offer: string; cta: string; stop_conditions: string }[];
  phases: { label: string; goals: string[]; actions: string[]; exit_metrics: string[] }[];
  weekly_capacity: { owner: string; activity: string; per_week: string }[];
  leading_metrics: string[];
  review_cadence: string[];
  experiments: { hypothesis: string; test: string; success_criteria: string }[];
  risks: { risk: string; mitigation: string }[];
  assumptions: string[];
};
