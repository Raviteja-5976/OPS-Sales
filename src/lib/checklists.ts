import type { ChecklistItem, ChecklistTemplate } from "./types";

type BuiltIn = Omit<ChecklistTemplate, "id" | "built_in">;

const i = (
  id: string,
  text: string,
  opts: Partial<Omit<ChecklistItem, "id" | "text">> = {},
): ChecklistItem => ({ id, text, required: opts.required ?? true, ...opts });

export const BUILT_IN_CHECKLISTS: BuiltIn[] = [
  {
    key: "foundation",
    name: "Sales foundation",
    description: "One-time, revisited quarterly. Turns what you sell into a credible commercial offer.",
    scope: "product",
    items: [
      i("f1", "Define the product in one sentence: customer, problem, mechanism, and outcome.", { why: "If you can't say it in one sentence, buyers can't repeat it internally.", ai_action: "draft" }),
      i("f2", "List the top 3 customer outcomes that can be supported with evidence.", { why: "Outcomes sell; features invite comparison.", ai_action: "draft" }),
      i("f3", "Identify ICP firmographics, buying triggers, and explicit disqualifiers.", { why: "Disqualifiers save more time than any email template.", ai_action: "draft" }),
      i("f4", "Map economic buyer, champion, end user, technical evaluator, and procurement/legal roles.", { ai_action: "draft" }),
      i("f5", "Document current alternatives: status quo, internal build, competitor, manual workaround.", { why: "The real competitor is usually 'do nothing'." }),
      i("f6", "Describe the differentiated mechanism — not only features."),
      i("f7", "Upload/approve proof: case studies, results, testimonials, security/integration facts.", { why: "Only approved proof can appear in outreach." }),
      i("f8", "Define package scope, implementation effort, capacity constraints, and pricing guardrails."),
      i("f9", "Collect common objections and the evidence required to answer each honestly.", { ai_action: "draft" }),
      i("f10", "Set pipeline stages, stage exits, response SLAs, and disqualification criteria.", { required: false }),
      i("f11", "Approve the claims allowed in external outreach and those requiring verification.", { why: "Prevents AI-generated messages from making promises you can't back." }),
    ],
  },
  {
    key: "sales_plan",
    name: "Sales plan",
    description: "Monthly/quarterly. Converts a revenue goal into segments, capacity and experiments.",
    scope: "plan",
    items: [
      i("p1", "Set revenue target, period, ACV, expected win rate, and sales-cycle length.", { ai_action: "calculate" }),
      i("p2", "Calculate required deals, qualified opportunities, meetings, and target accounts.", { ai_action: "calculate" }),
      i("p3", "Choose no more than 2–3 priority segments with observable buying triggers."),
      i("p4", "Define account tiers and research depth for each tier."),
      i("p5", "Set channel mix and weekly capacity by owner."),
      i("p6", "Build campaign themes: problem hypothesis, proof, offer, CTA, stop conditions.", { ai_action: "draft" }),
      i("p7", "Define inbound response SLA and routing owner."),
      i("p8", "Pick 1–3 experiments and their success criteria.", { required: false }),
      i("p9", "Schedule weekly pipeline review and monthly learning review."),
      i("p10", "Identify risks: proof, product gap, capacity, deliverability, positioning.", { required: false }),
    ],
  },
  {
    key: "account_outreach",
    name: "Account & cold outreach",
    description: "Before contacting an account. Relevance, permission and compliance first.",
    scope: "account",
    items: [
      i("a1", "Confirm account fits the ICP; record why it is a fit and why now.", { ai_action: "research" }),
      i("a2", "Validate recipient role, contact source, jurisdiction, and outreach basis."),
      i("a3", "Check suppression/opt-out status and duplicate contacts.", { why: "Automated check runs on every sequence." }),
      i("a4", "Capture a public signal with source and date — or use a clearly labelled role hypothesis."),
      i("a5", "Select a single problem/outcome angle relevant to that person."),
      i("a6", "Select credible proof for the segment; remove any unverified claim."),
      i("a7", "Draft a concise, human message with one low-friction CTA.", { ai_action: "draft" }),
      i("a8", "Define sequence purpose, timing, reply branches, and stop conditions."),
      i("a9", "Run deliverability, tone, privacy, compliance, and hallucination checks."),
      i("a10", "Require human approval before send; log activity and next review date."),
    ],
  },
  {
    key: "call",
    name: "Call: prepare, live, review",
    description: "Before, during and after every cold or discovery call.",
    scope: "call",
    items: [
      i("c1", "Know why this account, this role, and why now.", { section: "Before the call", mode: "prepare", ai_action: "research" }),
      i("c2", "Prepare one permission-based opener and one short relevance statement.", { section: "Before the call", mode: "prepare", ai_action: "draft" }),
      i("c3", "Know one verified proof point and one honest reason this may not be a fit.", { section: "Before the call", mode: "prepare" }),
      i("c4", "Choose the single discovery objective for this call.", { section: "Before the call", mode: "prepare" }),
      i("c5", "Review previous touches, stakeholder context, and promised follow-up.", { section: "Before the call", mode: "prepare" }),
      i("c6", "Prepare a respectful exit and a follow-up option.", { section: "Before the call", mode: "prepare", required: false }),
      i("c7", "Ask for permission and set a brief agenda; no deceptive familiarity.", { section: "During the call", mode: "live" }),
      i("c8", "Understand the current workflow/problem before describing the product.", { section: "During the call", mode: "live" }),
      i("c9", "Ask about operational impact: who/what is affected, frequency, consequence.", { section: "During the call", mode: "live" }),
      i("c10", "Explore desired outcome, priority, and time horizon.", { section: "During the call", mode: "live" }),
      i("c11", "Identify root cause, prior attempts, alternatives, and constraints.", { section: "During the call", mode: "live" }),
      i("c12", "Establish stakeholders, decision process, budget approach, and timing.", { section: "During the call", mode: "live", required: false }),
      i("c13", "Summarize what was heard and ask the buyer to correct it.", { section: "During the call", mode: "live" }),
      i("c14", "Ask permission before explaining only the relevant solution elements.", { section: "During the call", mode: "live" }),
      i("c15", "Link each solution point to a buyer-stated problem and proof.", { section: "During the call", mode: "live", required: false }),
      i("c16", "Surface implementation/adoption concerns before closing.", { section: "During the call", mode: "live", required: false }),
      i("c17", "Agree one specific next step with owner, date, purpose, and participants.", { section: "During the call", mode: "live" }),
      i("c18", "Pause after the question; listen rather than filling silence.", { section: "During the call", mode: "live", required: false }),
      i("c19", "Confirm facts versus hypotheses in the deal record.", { section: "After the call", mode: "review", ai_action: "summarize" }),
      i("c20", "Log pain, target, metric, roadblock, stakeholders, decision process, objections, commitments.", { section: "After the call", mode: "review", ai_action: "summarize" }),
      i("c21", "Send a factual recap with agreed actions — not a generic brochure.", { section: "After the call", mode: "review", ai_action: "draft" }),
      i("c22", "Create tasks and calendar holds; set a follow-up trigger.", { section: "After the call", mode: "review" }),
      i("c23", "Flag missing evidence and update the next-call checklist.", { section: "After the call", mode: "review", ai_action: "coach" }),
    ],
  },
  {
    key: "discovery_to_proposal",
    name: "Discovery to proposal",
    description: "Gate before writing a proposal.",
    scope: "deal",
    items: [
      i("d1", "Current state is described with at least two buyer-confirmed facts or metrics."),
      i("d2", "Desired state is explicit, measurable, and time-bound."),
      i("d3", "Gap is calculated; assumptions are transparent.", { ai_action: "calculate" }),
      i("d4", "Cost of inaction is buyer-confirmed or clearly recorded as an estimate."),
      i("d5", "Root cause and prior attempts are understood."),
      i("d6", "Decision process, stakeholders, procurement/security requirements, and timing are mapped."),
      i("d7", "Provider fit, delivery capacity, and implementation responsibilities are validated."),
      i("d8", "Solution scope maps directly to confirmed roadblocks.", { ai_action: "draft" }),
      i("d9", "Proposal includes exclusions, assumptions, outcomes, proof, implementation, price/options, and next step.", { ai_action: "draft" }),
      i("d10", "Mutual action plan has named owners and dates."),
    ],
  },
  {
    key: "close",
    name: "Close, handoff, renew, or disqualify",
    description: "End-of-deal hygiene that feeds learning back into the foundation.",
    scope: "deal",
    items: [
      i("x1", "Confirm commercial terms, scope, stakeholder approval, and signature path."),
      i("x2", "Confirm implementation owner, timeline, access/dependencies, and success metric."),
      i("x3", "Hand off the buyer's goals, constraints, promises, and risks to delivery."),
      i("x4", "If stalled, classify the reason with evidence and choose nurture, recycle, or close-lost.", { required: false }),
      i("x5", "If disqualified, record the reason and stop further outreach.", { required: false }),
      i("x6", "Feed recurring objections, lost reasons, and proof gaps back into the Sales Foundation."),
    ],
  },
];

/** Readiness of a checklist run: required items must be done or overridden with a reason. */
export function checklistProgress(
  items: ChecklistItem[],
  state: Record<string, { done?: boolean; overridden?: boolean }>,
) {
  const required = items.filter((x) => x.required);
  const done = items.filter((x) => state[x.id]?.done).length;
  const reqDone = required.filter((x) => state[x.id]?.done).length;
  const reqOverridden = required.filter((x) => !state[x.id]?.done && state[x.id]?.overridden).length;
  const outstanding = required.length - reqDone - reqOverridden;
  return {
    total: items.length,
    done,
    required: required.length,
    reqDone,
    reqOverridden,
    outstanding,
    ready: outstanding === 0,
  };
}
