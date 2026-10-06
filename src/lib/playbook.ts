// Methodology from part1.md / part2.md, expressed as respectful, permission-based guidance.
import type { BeliefKey } from "./types";

export type ConversationStage = {
  n: number;
  key: string;
  name: string;
  objective: string;
  exitGate: string;
  failureMode: string;
  prompts: string[];
  guardrail?: string;
  quickCaptures: string[];
};

export const CONVERSATION_STAGES: ConversationStage[] = [
  {
    n: 1,
    key: "frame",
    name: "Frame & permission",
    objective: "Establish purpose, a short agenda, and that \"no\" is an acceptable outcome.",
    exitGate: "Buyer agrees to the agenda and to diagnostic questions.",
    failureMode: "Long small talk or launching into a pitch without permission.",
    prompts: [
      "I know I've caught you in the middle of your day — is now a bad time for a brief reason for my call?",
      "Here's what I'd suggest: I ask a few questions about how you handle this today, you ask me anything, and at the end we decide together whether a next step makes sense. If it isn't a fit, it's completely fine to say so. Fair?",
    ],
    guardrail: "Never pretend to know a cold prospect. Peer-to-peer and honest about who you are.",
    quickCaptures: ["Agenda agreed", "Not a good time — call back"],
  },
  {
    n: 2,
    key: "current",
    name: "Current-state discovery",
    objective: "Map Point A with verifiable facts and metrics, not opinions.",
    exitGate: "At least two concrete, quantified operating facts.",
    failureMode: "Accepting vague complaints (\"leads are dry\") without numbers.",
    prompts: [
      "Walk me through what happens today when ___.",
      "When you say it's not working, what does that look like in numbers — volume, rate, time?",
      "Who is affected, how often, and what's the consequence when it happens?",
    ],
    quickCaptures: ["Fact", "Metric", "Pain"],
  },
  {
    n: 3,
    key: "gap",
    name: "Desired state & gap",
    objective: "Define the measurable target and date, then calculate the gap together.",
    exitGate: "Buyer confirms the size of the gap in their own words.",
    failureMode: "Pitching before the gap exists in hard figures.",
    prompts: [
      "Where does this need to be in 12 months for you to call it a success?",
      "So today it's ___ and you need ___ by ___ — that's a gap of ___. Did I get that right?",
    ],
    quickCaptures: ["Target metric", "Target date", "Gap confirmed"],
  },
  {
    n: 4,
    key: "roadblocks",
    name: "Roadblocks & alternatives",
    objective: "Understand why this is still unsolved and what else they might do.",
    exitGate: "Buyer articulates the internal roadblock and what has been tried.",
    failureMode: "Leaving \"we can do it in-house\" unexplored.",
    prompts: [
      "Since this has been a goal for a while, what's kept it from being solved?",
      "What have you tried already — tools, hires, agencies — and what happened?",
      "If you did this internally, what would it take in people and time?",
    ],
    quickCaptures: ["Roadblock", "Prior attempt", "Alternative"],
  },
  {
    n: 5,
    key: "priority",
    name: "Priority & feasibility",
    objective: "Establish the honest cost of delay, decision process, and capacity to implement.",
    exitGate: "Cost of inaction recorded (buyer-confirmed or marked estimate); decision path known.",
    failureMode: "Letting delay look free — or manufacturing urgency that isn't real.",
    prompts: [
      "If nothing changes for the next two quarters, what does that cost — financially and for the team?",
      "Who else is involved in a decision like this, and how have you bought similar things before?",
      "Looking at your team's capacity, what could make implementation hard?",
    ],
    guardrail: "Use the buyer's own numbers. No artificial scarcity or pressure.",
    quickCaptures: ["Cost of inaction", "Stakeholder", "Decision step", "Risk"],
  },
  {
    n: 6,
    key: "alignment",
    name: "Alignment check",
    objective: "Summarize what you heard; ask the buyer to correct it; ask permission to prescribe.",
    exitGate: "Buyer invites you to explain how you'd approach it.",
    failureMode: "Presenting without an invitation.",
    prompts: [
      "Let me play back what I heard: today ___, you need ___ by ___, the blocker is ___, and waiting costs roughly ___. What did I miss?",
      "Would it be useful if I showed you specifically how we'd tackle ___?",
    ],
    quickCaptures: ["Summary confirmed", "Correction"],
  },
  {
    n: 7,
    key: "prescription",
    name: "Prescriptive presentation",
    objective: "Present only the elements that map to confirmed roadblocks, with proof.",
    exitGate: "Each solution point is linked to a buyer-stated problem; price anchored to the gap.",
    failureMode: "Generic feature tour; price disclosed with no value context.",
    prompts: [
      "You mentioned ___ is the blocker. Here's how we handle exactly that: ___.",
      "A comparable customer saw ___ (approved proof only).",
      "Given the gap of ___, the investment is ___. How does that compare to what you expected?",
    ],
    guardrail: "After stating price and asking your question, pause. Let the buyer respond first.",
    quickCaptures: ["Reaction", "Question asked", "Concern"],
  },
  {
    n: 8,
    key: "commitment",
    name: "Commitment or diagnosis",
    objective: "Agree a concrete next step — or identify the unresolved concern and go back.",
    exitGate: "Next step with owner, date, purpose and participants — or explicit nurture/disqualify.",
    failureMode: "\"When are you free?\" — or arguing with a surface objection.",
    prompts: [
      "Would Tuesday at 10:00 or Thursday at 2:00 work better for the technical review?",
      "What specifically would need to become true for you to decide, and who needs to be involved?",
    ],
    quickCaptures: ["Next step", "Commitment", "Objection"],
  },
];

export type ObjectionPattern = {
  key: string;
  statement: string;
  primaryOrigin: string;
  secondaryOrigin: string;
  missingBelief: BeliefKey;
  mechanism: string;
  cushion: string;
  isolate: string;
  response: string;
  returnToStage: number;
};

export const OBJECTION_PATTERNS: ObjectionPattern[] = [
  {
    key: "price",
    statement: "It's too expensive.",
    primaryOrigin: "Stage 3 — Gap",
    secondaryOrigin: "Stage 2 — Current state",
    missingBelief: "goal",
    mechanism: "Price was presented without being anchored to a validated gap, or to the wrong budget owner.",
    cushion: "That's fair — this is a real investment and it should be scrutinized.",
    isolate: "Setting price aside for a moment, is this the right approach for the problem we discussed?",
    response: "Revisit the buyer-confirmed impact. If the gap isn't confirmed, go back and confirm it rather than defending the price.",
    returnToStage: 3,
  },
  {
    key: "budget",
    statement: "We don't have budget.",
    primaryOrigin: "Stage 5 — Priority",
    secondaryOrigin: "Stage 3 — Gap",
    missingBelief: "urgency",
    mechanism: "The cost of inaction wasn't established, so spending looks optional.",
    cushion: "That makes sense — well-run teams rarely have unallocated budget sitting around.",
    isolate: "If this paid back within a quarter, would finding budget still be the blocker, or is it something else?",
    response: "Explore how similar decisions get funded and who owns that budget. Don't discount.",
    returnToStage: 5,
  },
  {
    key: "send_info",
    statement: "Send me some information.",
    primaryOrigin: "Stage 1 — Frame",
    secondaryOrigin: "Stage 4 — Roadblocks",
    missingBelief: "pain",
    mechanism: "Insufficient relevance; the conversation became a vendor pitch instead of a diagnosis.",
    cushion: "Happy to — I don't want to bury you in generic material, though.",
    isolate: "What decision or metric should the material help you assess?",
    response: "Offer one focused resource and agree a specific review point on the calendar.",
    returnToStage: 2,
  },
  {
    key: "think",
    statement: "We need to think about it.",
    primaryOrigin: "Stage 1 — Frame",
    secondaryOrigin: "Stage 5 — Priority",
    missingBelief: "urgency",
    mechanism: "No agreed decision outcome up front, or the cost of delay is undefined.",
    cushion: "Of course — this deserves proper thought.",
    isolate: "What specifically needs to become true for you to decide, and who needs to be involved?",
    response: "Identify the unresolved risk or stakeholder; offer to help build the internal case.",
    returnToStage: 5,
  },
  {
    key: "in_house",
    statement: "We can build it in-house.",
    primaryOrigin: "Stage 4 — Roadblocks",
    secondaryOrigin: "Stage 6 — Alignment",
    missingBelief: "roadblock",
    mechanism: "Past internal attempts and capacity were never explored.",
    cushion: "That could well be the right call for some teams.",
    isolate: "What would a successful internal plan need in people, time, and focus?",
    response: "Explore prior attempts, capacity and trade-offs honestly. If in-house really is better, say so.",
    returnToStage: 4,
  },
  {
    key: "too_good",
    statement: "Sounds too good to be true.",
    primaryOrigin: "Stage 6 — Alignment",
    secondaryOrigin: "Stage 7 — Prescription",
    missingBelief: "vehicle",
    mechanism: "Buzzwords replaced a clear explanation of how it actually works.",
    cushion: "Healthy skepticism — I'd be asking the same.",
    isolate: "Which part seems least believable to you?",
    response: "Break the approach into concrete, verifiable steps and show approved proof only.",
    returnToStage: 6,
  },
  {
    key: "timing",
    statement: "Reach out next quarter.",
    primaryOrigin: "Stage 5 — Priority",
    secondaryOrigin: "Stage 3 — Gap",
    missingBelief: "urgency",
    mechanism: "Delay looks economically safe because its cost was never quantified.",
    cushion: "Understood — timing matters.",
    isolate: "Is it timing alone, or is something else making this lower priority?",
    response: "If timing is genuine, agree a dated check-in and nurture. Don't manufacture urgency.",
    returnToStage: 5,
  },
  {
    key: "competitor",
    statement: "We're looking at other options.",
    primaryOrigin: "Stage 4 — Roadblocks",
    secondaryOrigin: "Stage 7 — Prescription",
    missingBelief: "provider",
    mechanism: "Differentiation wasn't tied to the buyer's specific roadblock.",
    cushion: "That's smart — you should compare.",
    isolate: "What criteria will you use to decide between the options?",
    response: "Help define evaluation criteria tied to their roadblock; position on mechanism, not features.",
    returnToStage: 4,
  },
];

export type FunnelDiagnostic = {
  phase: string;
  symptom: string;
  misdiagnosis: string;
  rootCause: string;
  remedy: string;
};

export const FUNNEL_DIAGNOSTICS: FunnelDiagnostic[] = [
  {
    phase: "Inbound lead decay",
    symptom: "Under ~12% of inbound inquiries become conversations.",
    misdiagnosis: "Marketing is sending low-intent leads.",
    rootCause: "Response latency — first touch takes longer than the SLA.",
    remedy: "Route inbound to an owner and respond within the SLA (default 5 minutes).",
  },
  {
    phase: "Outbound opening",
    symptom: "Calls end in the first 15 seconds.",
    misdiagnosis: "The market is fatigued by cold outreach.",
    rootCause: "Opener sounds like a pitch; no permission or reason for the call.",
    remedy: "Use a calm, honest permission-based opener and a short, relevant reason.",
  },
  {
    phase: "Discovery conversion",
    symptom: "Cordial calls that don't lead to a next meeting.",
    misdiagnosis: "Contact lacks authority.",
    rootCause: "Shallow discovery — no quantified impact.",
    remedy: "Stop pitching early; capture current state, gap and cost of inaction.",
  },
  {
    phase: "Presentation",
    symptom: "Buyers ask for feature breakdowns and compare tools.",
    misdiagnosis: "Materials aren't detailed enough.",
    rootCause: "Feature-led pitching rather than outcome-led prescription.",
    remedy: "Map each solution element to a confirmed roadblock; package the outcome.",
  },
  {
    phase: "Pricing",
    symptom: "Price objections on 40%+ of qualified pitches.",
    misdiagnosis: "We're priced above market.",
    rootCause: "Price disclosed without anchoring to the buyer's confirmed gap.",
    remedy: "Anchor investment to the annual gap; confirm the gap before pricing.",
  },
  {
    phase: "Post-pricing",
    symptom: "Routine demands for discounts and scope cuts.",
    misdiagnosis: "Buyers have rigid budgets.",
    rootCause: "Seller fills silence after quoting, signaling low confidence.",
    remedy: "State the price, ask one question, and pause.",
  },
];
