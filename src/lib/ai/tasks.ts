import "server-only";
import { generateJSON } from "./client";
import * as s from "./schemas";
import { CONVERSATION_STAGES, OBJECTION_PATTERNS } from "../playbook";
import { BELIEFS } from "../types";
import type {
  Account,
  AccountBrief,
  CallPrep,
  CallReview,
  Contact,
  DealDiagnosis,
  DealEvidence,
  FoundationContent,
  LiveNote,
  Product,
  ProofItem,
  ProposalDraft,
  SalesPlanContent,
  SalesPlanInputs,
  SequenceContent,
} from "../types";
import type { FunnelResult } from "../funnel";
import type { DealHealth } from "../readiness";

// ---------------------------------------------------------------------------
// Context formatting helpers
// ---------------------------------------------------------------------------

const j = (v: unknown) => JSON.stringify(v, null, 1);

function productBlock(p: Pick<Product, "name" | "one_liner" | "category" | "website" | "intake">) {
  return `PRODUCT (company-provided):\n${j({ name: p.name, one_liner: p.one_liner, category: p.category, website: p.website, ...p.intake })}`;
}

function foundationBlock(f: FoundationContent | null | undefined, approved: boolean) {
  if (!f || !Object.keys(f).length) return "SALES FOUNDATION: none yet.";
  return `SALES FOUNDATION (${approved ? "approved by the company" : "DRAFT — not yet approved; treat claims cautiously"}):\n${j(f)}`;
}

function proofBlock(proof: ProofItem[]) {
  if (!proof.length) return "APPROVED PROOF LIBRARY: empty. Do not cite any results, customers or figures.";
  return `APPROVED PROOF LIBRARY (the ONLY results/customers/figures you may cite):\n${proof
    .map((p) => `- [${p.kind}] ${p.title}: ${p.body ?? ""}${p.source_url ? ` (source: ${p.source_url})` : ""}`)
    .join("\n")}`;
}

const SHAPE_CLAIM = `{"text": string, "source": "company-provided"|"public-research"|"ai-hypothesis"|"buyer-confirmed"}`;

// ---------------------------------------------------------------------------
// Foundation strategist
// ---------------------------------------------------------------------------

const STRATEGIST = "Foundation strategist. You interview the company and propose positioning, ICP, offer and sales motion. You must not invent market evidence or make unsupported outcome guarantees.";

export async function foundationInterview(product: Product) {
  return generateJSON({
    role: STRATEGIST,
    instructions:
      "Review the intake. Identify the most important missing or vague information needed to build a credible Sales Foundation (positioning, ICP, offer, proof, objections, motion). Ask at most 6 specific questions, highest-impact first. Skip anything already answered well. If the intake is complete, return an empty list.",
    shape: `{"questions": [{"question": string, "why": string}]}`,
    context: productBlock(product),
    schema: s.interviewSchema,
    maxTokens: 800,
  });
}

const FOUNDATION_PARTS = {
  positioning: {
    instructions:
      "Produce the positioning section: a one-sentence product definition (customer, problem, mechanism, outcome), a positioning statement, category framing, a problem → mechanism → outcome narrative, 3–5 differentiators (mechanism, not features), and how we differ from each realistic alternative (status quo, internal build, competitors, manual workaround).",
    shape: `{"one_liner": CLAIM, "positioning_statement": CLAIM, "category_framing": CLAIM, "narrative": {"problem": CLAIM, "mechanism": CLAIM, "outcome": CLAIM}, "differentiators": [CLAIM], "alternatives": [{"name": string, "type": "status quo"|"internal build"|"competitor"|"manual workaround", "how_we_differ": CLAIM}]}`,
    schema: s.positioningSchema,
  },
  market: {
    instructions:
      "Produce the market section: ICP firmographics, observable buying triggers, explicit disqualifiers, 3 account tiers with the research depth for each, and the buyer committee (economic buyer, champion, end user, technical evaluator, procurement/legal) with what each cares about and their persona-specific pains.",
    shape: `{"icp": {"firmographics": [CLAIM], "buying_triggers": [CLAIM], "disqualifiers": [CLAIM]}, "account_tiers": [{"tier": 1|2|3, "definition": string, "research_depth": string}], "buyer_committee": [{"role": string, "cares_about": [CLAIM], "pains": [CLAIM]}]}`,
    schema: s.marketSchema,
  },
  offer: {
    instructions:
      "Produce the offer section: the top customer outcomes (only those the input supports; label others ai-hypothesis), a proof inventory built ONLY from company-provided proof, a list of evidence gaps (proof the company should collect), the core package (name, scope bullets, onboarding), optional add-ons, pricing hypotheses (clearly labelled), and guarantees ONLY where the input substantiates them (otherwise return an empty list).",
    shape: `{"outcomes": [CLAIM], "proof_inventory": [CLAIM], "evidence_gaps": [string], "core_package": {"name": string, "scope": [string], "onboarding": string}, "add_ons": [string], "pricing_hypotheses": [CLAIM], "guarantees": [CLAIM]}`,
    schema: s.offerSchema,
  },
  motion: {
    instructions: `Produce the sales-motion section: an objection map (for each likely objection: which of the seven buying beliefs is probably missing — one of ${Object.keys(BELIEFS).join(", ")} — the evidence needed to answer it honestly, and a respectful response pattern: acknowledge, isolate, diagnose, ask), recommended pipeline stages with exit criteria, qualification criteria, leading metrics, claims allowed in external outreach (only things supported by company-provided input), and claims that require verification before use.`,
    shape: `{"objections": [{"objection": string, "missing_belief": string, "evidence_needed": string, "response_pattern": string}], "pipeline_stages": [{"stage": string, "exit_criteria": [string]}], "qualification_criteria": [string], "metrics": [string], "claims_allowed": [string], "claims_require_verification": [string]}`,
    schema: s.motionSchema,
  },
} as const;

export type FoundationPart = keyof typeof FOUNDATION_PARTS;
export const FOUNDATION_PART_KEYS = Object.keys(FOUNDATION_PARTS) as FoundationPart[];

export async function foundationPart(part: FoundationPart, product: Product, proof: ProofItem[], prior: FoundationContent) {
  const def = FOUNDATION_PARTS[part];
  return generateJSON({
    role: STRATEGIST,
    instructions: `${def.instructions}\nKeep it consistent with any sections already drafted. Every claim must carry a source label.`,
    shape: def.shape.replaceAll("CLAIM", SHAPE_CLAIM),
    context: [productBlock(product), proofBlock(proof), `SECTIONS ALREADY DRAFTED:\n${j(prior)}`].join("\n\n"),
    schema: def.schema as never,
    maxTokens: 2200,
  });
}

// ---------------------------------------------------------------------------
// Sales plan
// ---------------------------------------------------------------------------

export async function salesPlan(
  product: Product,
  foundation: FoundationContent | null,
  approved: boolean,
  inputs: SalesPlanInputs,
  funnel: FunnelResult,
) {
  return generateJSON<SalesPlanContent>({
    role: "Foundation strategist building a 30/60/90-day sales plan.",
    instructions:
      "Build a practical 30/60/90-day sales plan using the funnel math provided (do not change the numbers; reference them). Choose no more than 2–3 priority segments with observable triggers. Set channel mix (warm intros, email, phone, LinkedIn/manual social, partners, events, inbound follow-up), campaign themes per segment, weekly capacity by owner, leading metrics, a review cadence, 1–3 experiments with success criteria, risks with mitigations, and list every assumption explicitly. Phases should be labelled 'Days 1–30', 'Days 31–60', 'Days 61–90'.",
    shape: `{"summary": string, "segments": [{"name": string, "triggers": [string], "why": string}], "account_tiers": [{"tier": number, "definition": string, "research_depth": string}], "channel_mix": [{"channel": string, "share": string, "notes": string}], "campaigns": [{"theme": string, "segment": string, "problem_hypothesis": string, "proof": string, "offer": string, "cta": string, "stop_conditions": string}], "phases": [{"label": string, "goals": [string], "actions": [string], "exit_metrics": [string]}], "weekly_capacity": [{"owner": string, "activity": string, "per_week": string}], "leading_metrics": [string], "review_cadence": [string], "experiments": [{"hypothesis": string, "test": string, "success_criteria": string}], "risks": [{"risk": string, "mitigation": string}], "assumptions": [string]}`,
    context: [
      productBlock(product),
      foundationBlock(foundation, approved),
      `PLAN INPUTS:\n${j(inputs)}`,
      `FUNNEL MATH (computed):\n${j({
        closed_deals_needed: funnel.deals,
        qualified_opportunities: funnel.opportunities,
        first_meetings: funnel.meetings,
        target_accounts: funnel.accounts,
        selling_weeks: funnel.sellingWeeks,
        accounts_per_week: funnel.accountsPerWeek.toFixed(1),
        meetings_per_week: funnel.meetingsPerWeek.toFixed(1),
        touches_per_seller_per_week: funnel.touchesPerSellerPerWeek.toFixed(0),
        pipeline_coverage: funnel.pipelineCoverage.toFixed(1) + "x",
        warnings: funnel.warnings,
      })}`,
    ].join("\n\n"),
    schema: s.planSchema as never,
    maxTokens: 3000,
  });
}

// ---------------------------------------------------------------------------
// Research assistant
// ---------------------------------------------------------------------------

export async function accountBrief(
  account: Account,
  contacts: Contact[],
  product: Product,
  foundation: FoundationContent | null,
  approved: boolean,
  proof: ProofItem[],
) {
  return generateJSON<AccountBrief>({
    role: "Research assistant. You summarize only authorized, user-provided data with citations and dates. You never treat inference as fact, never imply access to private data, and never use sensitive personal data.",
    instructions:
      "Write a short account brief for selling this product to this account. Signals: use ONLY the user-supplied signals (keep their url/date; explain relevance). Fit reasons: label each source. Operational hypotheses must be phrased as hypotheses to validate. Suggest buyer roles to engage and their likely concerns. Relevant proof: titles from the approved library only. Give one recommended outreach angle. If the account looks like a poor fit against the ICP/disqualifiers, say so in disqualification_risk (else null). List open questions to answer in discovery.",
    shape: `{"fit_summary": string, "fit_reasons": [${SHAPE_CLAIM}], "signals": [{"text": string, "url": string, "date": string, "relevance": string}], "hypotheses": [string], "buyer_roles": [{"role": string, "why": string, "likely_concerns": [string]}], "relevant_proof": [string], "outreach_angle": string, "disqualification_risk": string|null, "open_questions": [string]}`,
    context: [
      productBlock(product),
      foundationBlock(foundation, approved),
      proofBlock(proof),
      `ACCOUNT (user-provided):\n${j({
        name: account.name,
        domain: account.domain,
        industry: account.industry,
        employees: account.employee_count,
        geography: account.geography,
        tier: account.tier,
        fit_reason: account.fit_reason,
        why_now: account.why_now,
        notes: account.notes,
      })}`,
      `PUBLIC SIGNALS (user-supplied):\n${j(account.signals)}`,
      `CONTACTS:\n${j(contacts.map((c) => ({ name: c.name, title: c.title, buying_role: c.buying_role })))}`,
    ].join("\n\n"),
    schema: s.briefSchema as never,
    maxTokens: 1800,
  });
}

// ---------------------------------------------------------------------------
// Outreach editor
// ---------------------------------------------------------------------------

export async function outreachSequence(args: {
  product: Product;
  foundation: FoundationContent | null;
  approved: boolean;
  proof: ProofItem[];
  account: Account;
  contact: Contact;
  objective: string;
  angle: string;
  channels: string[];
  senderName: string;
  senderCompany: string;
}) {
  const { product, foundation, approved, proof, account, contact } = args;
  return generateJSON<SequenceContent>({
    role: "Outreach editor. You produce channel-specific drafts for a human to review. You never send, never evade spam filters, never bypass opt-outs.",
    instructions: `Build a 3–5 step outreach sequence over ~14–21 days using only these channels: ${args.channels.join(", ")}.
Objective: ${args.objective} (the goal is ${args.objective}, NOT to close).
Rules:
- Open with a cited public signal from the account's signals (include its source in opening_basis), or if none fits, a clearly role-based hypothesis (kind "role_hypothesis"). Never imply you have spoken before.
- Each step gives a DIFFERENT reason to respond, under 120 words for emails, one low-friction CTA, plain human language, no hype.
- Cite results/figures ONLY from the approved proof library. If none, describe the mechanism instead.
- Every email ends with a respectful opt-out line, e.g. "If this isn't relevant, just reply 'no' and I won't follow up."
- Call opener: honest and permission-based, e.g. acknowledge you're interrupting and ask for 30 seconds to explain why you called.
- Include a voicemail (<30 seconds spoken), a short LinkedIn connection note, reply branches (interested, not now, wrong person, not interested/opt-out, send info), and stop conditions.
- Provide 2 alternative opening email variants with different angles and explain each variant's intent.
- Sign as ${args.senderName} from ${args.senderCompany}.`,
    shape: `{"rationale": string, "opening_basis": {"kind": "cited_signal"|"role_hypothesis", "text": string, "source": string}, "steps": [{"day": number, "channel": "email"|"phone"|"linkedin"|"voicemail", "subject": string, "body": string, "reason_to_respond": string, "stop_if": string}], "call_opener": string, "voicemail": string, "linkedin_note": string, "reply_branches": [{"if_reply": string, "respond_with": string}], "stop_conditions": [string], "variants": [{"label": string, "intent": string, "subject": string, "body": string}]}`,
    context: [
      productBlock(product),
      foundationBlock(foundation, approved),
      proofBlock(proof),
      `ACCOUNT:\n${j({ name: account.name, industry: account.industry, fit_reason: account.fit_reason, why_now: account.why_now, signals: account.signals, brief: account.research_brief })}`,
      `RECIPIENT:\n${j({ name: contact.name, title: contact.title, buying_role: contact.buying_role })}`,
      args.angle ? `SELLER'S CHOSEN ANGLE: ${args.angle}` : "",
    ].join("\n\n"),
    schema: s.sequenceSchema as never,
    maxTokens: 3000,
  });
}

export async function outreachReview(content: SequenceContent, foundation: FoundationContent | null, proof: ProofItem[]) {
  return generateJSON({
    role: "Outreach quality reviewer. You check drafts before a human approves them.",
    instructions:
      "Review the sequence for: claims not supported by the approved proof or allowed claims (fail), implied prior relationship or deceptive familiarity (fail), pressure/scarcity (warn), excessive or creepy personalization using personal data (warn), generic copy with no clear reason to care (warn), more than one CTA (warn), tone that is pushy or salesy (warn). Return only real issues; an empty list is fine.",
    shape: `{"issues": [{"severity": "fail"|"warn", "area": string, "issue": string, "fix": string}], "overall": string}`,
    context: [
      `ALLOWED CLAIMS: ${j(foundation?.motion?.claims_allowed ?? [])}`,
      `CLAIMS REQUIRING VERIFICATION: ${j(foundation?.motion?.claims_require_verification ?? [])}`,
      proofBlock(proof),
      `SEQUENCE:\n${j(content)}`,
    ].join("\n\n"),
    schema: s.outreachReviewSchema,
    maxTokens: 1000,
  });
}

// ---------------------------------------------------------------------------
// Call copilot
// ---------------------------------------------------------------------------

const STAGE_GUIDE = CONVERSATION_STAGES.map((st) => `${st.n}. ${st.name}: ${st.objective} Exit: ${st.exitGate}`).join("\n");

export async function callPrep(args: {
  callKind: string;
  objective: string | null;
  product: Product;
  foundation: FoundationContent | null;
  approved: boolean;
  proof: ProofItem[];
  account: Account;
  contact: Contact | null;
  evidence: DealEvidence | null;
  previous: { title: string; date: string; summary: string }[];
}) {
  return generateJSON<CallPrep>({
    role: "Call copilot preparing a seller for a call. You prepare; the seller runs the conversation.",
    instructions: `Prepare a one-page call brief for a ${args.callKind.replace("_", " ")} call.${args.objective ? ` Seller's objective: ${args.objective}.` : ""}
- why_account / why_role / why_now: grounded in provided data; label hypotheses in the text ("Hypothesis: ...").
- opener: permission-based, honest (no fake familiarity).
- proof_point: one item from the approved library, or "No approved proof yet — describe the mechanism" if empty.
- honest_non_fit: one honest reason this may not be a fit.
- questions: 6–10 discovery questions, each mapped to a conversation stage number and to the evidence field it fills. Prioritize what is still UNKNOWN in the deal evidence.
- previous_context: key facts from earlier calls/evidence the seller must remember.
Conversation stages:\n${STAGE_GUIDE}`,
    shape: `{"why_account": string, "why_role": string, "why_now": string, "opener": string, "relevance_statement": string, "proof_point": string, "honest_non_fit": string, "discovery_objective": string, "questions": [{"stage": number, "question": string, "fills": string}], "previous_context": [string], "respectful_exit": string, "follow_up_option": string}`,
    context: [
      productBlock(args.product),
      foundationBlock(args.foundation, args.approved),
      proofBlock(args.proof),
      `ACCOUNT:\n${j({ name: args.account.name, industry: args.account.industry, fit_reason: args.account.fit_reason, why_now: args.account.why_now, signals: args.account.signals, brief: args.account.research_brief })}`,
      `CONTACT:\n${j(args.contact ? { name: args.contact.name, title: args.contact.title, buying_role: args.contact.buying_role } : null)}`,
      `CURRENT DEAL EVIDENCE:\n${j(args.evidence)}`,
      `PREVIOUS CALLS:\n${j(args.previous)}`,
    ].join("\n\n"),
    schema: s.prepSchema as never,
    maxTokens: 1800,
  });
}

export async function liveNextQuestion(args: { stage: number; evidence: DealEvidence | null; notes: LiveNote[]; productName: string }) {
  const st = CONVERSATION_STAGES.find((x) => x.n === args.stage) ?? CONVERSATION_STAGES[0];
  return generateJSON({
    role: "Live call copilot. You surface the single next most useful question. You never script the whole call.",
    instructions: `The seller is in stage ${st.n} (${st.name}): ${st.objective}. Exit gate: ${st.exitGate}.
Given what has been captured, propose ONE next question (short, natural, one idea) that fills the most important missing evidence. If the stage's exit gate seems met, suggest the next stage. Also list 2–3 things to listen for.
Stages:\n${STAGE_GUIDE}`,
    shape: `{"question": string, "why": string, "fills": string, "listen_for": [string], "suggested_stage": number}`,
    context: `PRODUCT: ${args.productName}\n\nDEAL EVIDENCE:\n${j(args.evidence)}\n\nNOTES CAPTURED THIS CALL:\n${j(args.notes.slice(-30))}`,
    schema: s.nextQuestionSchema,
    maxTokens: 500,
  });
}

export async function objectionDiagnosis(args: { objection: string; stage: number; evidence: DealEvidence | null; productName: string }) {
  return generateJSON({
    role: "Objection and deal-diagnosis coach. Objections are symptoms of missing evidence or belief upstream. You never argue, discount, or pressure.",
    instructions: `Diagnose the buyer's statement. Steps: (1) a short, genuine cushion that validates without conceding, (2) an isolation question, (3) which buying belief is likely missing (one of: ${Object.entries(BELIEFS)
      .map(([k, b]) => `${k} = ${b.label}`)
      .join("; ")}), (4) the upstream conversation stage where it originated, (5) a diagnosis grounded in the evidence record (what is missing), (6) one suggested question, (7) which stage number to return to, (8) what to avoid saying.
Reference patterns:\n${OBJECTION_PATTERNS.map((o) => `"${o.statement}" → origin ${o.primaryOrigin}; missing ${o.missingBelief}; ${o.mechanism}`).join("\n")}`,
    shape: `{"cushion": string, "isolate": string, "likely_missing_belief": string, "upstream_origin": string, "diagnosis": string, "suggested_question": string, "return_to_stage": number, "avoid": [string]}`,
    context: `PRODUCT: ${args.productName}\nCURRENT STAGE: ${args.stage}\nBUYER SAID: "${args.objection}"\n\nDEAL EVIDENCE:\n${j(args.evidence)}`,
    schema: s.objectionSchema,
    maxTokens: 700,
  });
}

export async function callReview(args: {
  productName: string;
  accountName: string;
  contactName: string | null;
  sellerName: string;
  notes: string;
  transcript: string;
  liveNotes: LiveNote[];
  evidence: DealEvidence | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return generateJSON<CallReview>({
    role: "Deal analyst and coach reviewing a completed call. You extract structured evidence and give specific, evidence-linked, non-judgmental coaching.",
    instructions: `Today is ${today}. From the notes/transcript:
- evidence_updates: ONLY new information from this call. Things the buyer said → source "buyer-confirmed". Seller assumptions → "ai-hypothesis". Do not repeat what is already in the current evidence. Belief scores (0–10) only where the call gives evidence; otherwise null. Amounts as plain numbers.
- missing_evidence: the most important things still unknown.
- next_step: as agreed on the call (owner/date/purpose), or nulls if none was agreed — do not invent one.
- commitments: promises made by either side, with owner.
- recap_email: a short, factual recap to the buyer: what we heard, what was agreed, next step. No brochure, no hype, no new claims.
- coaching: 2–3 strengths and 2–3 improvements tied to specific moments; stage_skipped lists conversation stages that were rushed or skipped.
- objections: each buyer objection with its likely upstream origin stage and missing belief.
Stages:\n${STAGE_GUIDE}`,
    shape: `{"summary": string, "evidence_updates": {"account_fit": {"status": "hypothesis"|"confirmed", "reason": string}, "stakeholders": [{"name": string, "title": string, "role": "economic_buyer"|"champion"|"end_user"|"technical_evaluator"|"procurement"|"influencer"|"unknown", "stance": "champion"|"supporter"|"neutral"|"blocker"|"unknown", "source": string}], "current_state": {"facts": [${SHAPE_CLAIM}], "metrics": [{"label": string, "value": string, "source": string}]}, "desired_state": {"facts": [...], "metrics": [...], "target_date": string|null}, "value_gap": {"amount": number|null, "cadence": "monthly"|"annual", "assumptions": [string], "buyer_confirmed": boolean}, "roadblocks": [${SHAPE_CLAIM}], "prior_attempts": [${SHAPE_CLAIM}], "cost_of_inaction": {"amount": number|null, "cadence": "monthly", "confidence": "estimate"|"buyer-confirmed"}, "buying_beliefs": {"pain"|"goal"|"roadblock"|"vehicle"|"provider"|"self_efficacy"|"urgency": {"score": number|null, "evidence": string}}, "decision_process": {"criteria": [string], "people": [string], "date": string|null, "procurement": string}}, "missing_evidence": [string], "next_step": {"owner": string|null, "date": "YYYY-MM-DD"|null, "purpose": string|null}, "commitments": [{"text": string, "owner": string, "due": "YYYY-MM-DD"|null, "done": false}], "recap_email": {"subject": string, "body": string}, "coaching": {"strengths": [string], "improvements": [string], "stage_skipped": [string]}, "objections": [{"text": string, "origin_stage": string, "missing_belief": string}]}`,
    context: [
      `PRODUCT: ${args.productName}\nACCOUNT: ${args.accountName}\nBUYER CONTACT: ${args.contactName ?? "unknown"}\nSELLER: ${args.sellerName}`,
      `CURRENT DEAL EVIDENCE:\n${j(args.evidence)}`,
      `LIVE NOTES (stage-tagged):\n${j(args.liveNotes)}`,
      `SELLER NOTES:\n${args.notes || "(none)"}`,
      `TRANSCRIPT:\n${(args.transcript || "(none)").slice(0, 60000)}`,
    ].join("\n\n"),
    schema: s.reviewSchema as never,
    maxTokens: 3500,
  });
}

// ---------------------------------------------------------------------------
// Deal analyst
// ---------------------------------------------------------------------------

export async function dealDiagnosis(args: {
  dealName: string;
  stage: string;
  amount: number | null;
  product: Product;
  foundation: FoundationContent | null;
  evidence: DealEvidence;
  health: DealHealth;
}) {
  return generateJSON<DealDiagnosis>({
    role: "Deal analyst. You diagnose missing qualification and recommend the next best action with explainable reasoning. You never score people as facts.",
    instructions: `Diagnose this deal. Use the seven buying beliefs as a diagnostic lens (${Object.entries(BELIEFS)
      .map(([k, b]) => `${k}: ${b.label}`)
      .join("; ")}). Identify the 1–3 weakest beliefs with why and the question that would test each. Give one next best action with rationale. List concrete risks. If the deal should be nurtured or disqualified, say so plainly. Never recommend pressure tactics.`,
    shape: `{"summary": string, "next_best_action": {"action": string, "why": string}, "weakest_beliefs": [{"belief": string, "why": string, "question": string}], "risks": [string], "questions_for_next_call": [string]}`,
    context: [
      productBlock(args.product),
      `DEAL: ${args.dealName} | stage: ${args.stage} | amount: ${args.amount ?? "unknown"}`,
      `EVIDENCE:\n${j(args.evidence)}`,
      `RULES ENGINE HEALTH:\n${j({ status: args.health.status, failing: args.health.checks.filter((c) => !c.ok).map((c) => c.label), red_flags: args.health.redFlags })}`,
    ].join("\n\n"),
    schema: s.diagnosisSchema as never,
    maxTokens: 1200,
  });
}

export async function proposalDraft(args: {
  dealName: string;
  amount: number | null;
  currency: string;
  product: Product;
  foundation: FoundationContent | null;
  approved: boolean;
  proof: ProofItem[];
  evidence: DealEvidence;
  accountName: string;
}) {
  return generateJSON<ProposalDraft>({
    role: "Deal analyst drafting a buyer-relevant proposal and mutual action plan for the seller to edit.",
    instructions:
      "Draft a proposal from CONFIRMED evidence. The value case uses the buyer's own numbers; anything estimated must say so in assumptions. Each solution element must map to a recorded roadblock (if there are none, say discovery is incomplete). Proof only from the approved library. Include scope, exclusions, 2–3 options with price notes (use the deal amount if provided; never invent pricing — write 'to be confirmed' otherwise), an implementation plan, and a mutual action plan with owners from both sides and dates (use 'TBC' if unknown). List every claim that still needs verification in unverified_claims.",
    shape: `{"executive_summary": string, "value_case": {"baseline": string, "target": string, "gap": string, "cost_of_delay": string, "assumptions": [string]}, "solution_map": [{"roadblock": string, "solution_element": string, "proof": string}], "scope": [string], "exclusions": [string], "options": [{"name": string, "description": string, "price_note": string}], "implementation_plan": [{"phase": string, "owner": string, "timing": string}], "mutual_action_plan": [{"step": string, "owner": string, "date": string}], "open_risks": [string], "unverified_claims": [string]}`,
    context: [
      productBlock(args.product),
      foundationBlock(args.foundation, args.approved),
      proofBlock(args.proof),
      `DEAL: ${args.dealName} with ${args.accountName} | amount: ${args.amount ?? "not set"} ${args.currency}`,
      `EVIDENCE:\n${j(args.evidence)}`,
    ].join("\n\n"),
    schema: s.proposalSchema as never,
    maxTokens: 2800,
  });
}
