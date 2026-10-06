# OpenRiverStack: AI-Guided Revenue Execution Platform

## 1. Product thesis

**OpenRiverStack is an AI sales-workbench that turns a company’s product knowledge into an evidence-led, repeatable sales motion.** It helps founders and sales teams decide *who to sell to*, package the offer, prepare each interaction, run high-quality discovery, follow up precisely, and improve the sales system from the evidence collected.

It is deliberately **not** another generic AI copywriter or a thin CRM layer. Those tools can write an email, but they do not tell a seller whether the account is worth pursuing, what must be learned before pitching, whether a deal is genuinely qualified, or why a deal stalled. OpenRiverStack does.

The platform turns the principles in `part1.md` and `part2.md` into practical workflows:

- diagnose before prescribing;
- sell a measurable outcome, not a feature list;
- make the cost of inaction explicit without manufacturing false urgency;
- use questions, evidence, and buyer context instead of pressure;
- trace objections to missing discovery or missing confidence; and
- make next steps specific, owned, and dated.

### Product promise

> “Give OpenRiverStack your company, offer, and customer context. It will build the sales plan, prepare the seller, guide the live conversation, and turn every outcome into the next best action.”

### What problem it solves

| Problem today | Why existing tools fail | OpenRiverStack outcome |
|---|---|---|
| Teams begin with a vague product pitch. | A CRM stores activity but does not create positioning. | A clear ICP, differentiated offer, proof plan, and value hypothesis. |
| Cold outreach sounds generic and gets ignored. | AI writers produce copy without account-specific relevance or a campaign strategy. | Research-backed, permission-aware multichannel sequences with a clear reason to care. |
| Sellers pitch too early and collect shallow notes. | Call recorders summarize after the fact; they do not guide the next best question. | A live discovery checklist that keeps the seller in the correct conversation stage. |
| Price objections, “send me info,” and “think about it” recur. | Objections are treated as isolated scripts. | A root-cause diagnosis: what evidence, belief, stakeholder, or implementation concern is missing. |
| Good sales practice lives in the founder’s head. | Static playbooks are ignored in the moment. | Adaptive checklists, coaching, and templates that are used before, during, and after every interaction. |
| Managers see lagging revenue, not the sales-system break. | Activity dashboards confuse volume with quality. | Funnel diagnostics tied to leading evidence: response speed, discovery completeness, stage exits, and objection patterns. |

## 2. Who it is for

### Initial customer segment

Start with B2B founders, small sales teams, agencies, consultants, and B2B SaaS companies selling moderately complex products or services. They often have limited enablement support, sales cycles of weeks to months, and a need to turn founder knowledge into a consistent process.

The first version should support both:

1. **Founder-led sales:** a founder needs positioning, a target-account plan, a meeting prep brief, and help conducting discovery.
2. **Rep-led sales:** a manager needs a shared playbook, required stage evidence, coaching, and visibility into where deals fail.

Avoid beginning with high-volume, transactional sales or fully autonomous AI calling. The valuable wedge is seller augmentation for thoughtful B2B conversations.

### Jobs to be done

- “Help me turn what we sell into a compelling, credible commercial offer.”
- “Tell me which accounts and people are worth contacting, and why now.”
- “Help me send relevant cold emails and make calls without sounding automated.”
- “Keep me from pitching before I understand the buyer’s problem.”
- “Give me a checklist in the exact moment I need it: planning, a call, a proposal, or a follow-up.”
- “Show me what to do next and why this deal is blocked.”
- “Help my team learn from actual calls, not just activity counts.”

## 3. Product principles and boundaries

1. **Evidence before claims.** AI may draft hypotheses and questions, but it must label unverified assumptions and never invent customer results, integrations, pricing, or research.
2. **Seller remains in control.** In v1, the AI drafts, guides, summarizes, and recommends. A person approves outreach and makes the call.
3. **Checklist first, chat second.** The default interface is a contextual workflow with completion criteria—not an empty prompt box.
4. **Adapt to the motion.** A $2,000 service and an enterprise platform need different qualification requirements. Admins can tailor stages, fields, proof, terminology, and exit criteria.
5. **Respect the buyer.** No deceptive identity framing, fake familiarity, artificial scarcity, pressure tactics, or harassment. The principles from the source material are applied as clear, permission-based, peer-to-peer communication.
6. **Compliance is a product feature.** Outreach must support consent, opt-out/suppression, sending limits, approved sender identities, audit trails, and jurisdiction-specific policies. Calling and recording require regional consent checks and clear notice.
7. **Measure learning, not just volume.** The system scores evidence quality and motion health, not merely emails sent, calls made, or AI usage.

## 4. The end-to-end experience

```text
Company & offer intake
        ↓
Sales foundation (ICP, positioning, proof, packages, sales plan)
        ↓
Account selection & research → campaign / sequence
        ↓
Pre-call preparation → live call guide → post-call evidence capture
        ↓
Proposal / follow-up / stakeholder plan → close or nurture
        ↓
Funnel diagnostics, coaching, and playbook improvement
```

The platform has two persistent objects:

- **Sales Foundation:** reusable company truth—offer, ICP, buyer roles, differentiators, proof, pricing guardrails, objections, and sales process.
- **Deal Evidence Record:** account- and opportunity-specific facts—stakeholders, sources, current state, desired state, quantified gap, roadblocks, urgency, confidence, decisions, commitments, and next actions.

This separation prevents a common AI failure: blending generic company claims with facts confirmed by a buyer.

## 5. Core modules

### A. Guided onboarding and Sales Foundation Builder

The user enters or imports:

- company, website, product/service, category, and target geography;
- ideal customers, industries, company size, buyer roles, and exclusion criteria;
- current pricing, delivery model, capacity, constraints, and sales cycle;
- existing collateral, case studies, testimonials, call notes, proposals, and CRM data;
- outcomes delivered, differentiators, competitors/alternatives, and known objections.

The AI interviews the user where information is missing, then proposes a versioned Sales Foundation:

- ICP and account tiers;
- buyer committee map and persona-specific pains;
- positioning statement and category framing;
- problem → mechanism → outcome narrative;
- proof inventory and evidence gaps;
- offer architecture: core package, scope, onboarding, guarantees only where substantiated, pricing hypotheses, and optional add-ons;
- objection map and competitor/alternative positioning;
- recommended pipeline stages, qualification criteria, and metrics.

Every generated claim has a source label: **company-provided**, **public research**, **AI hypothesis**, or **buyer-confirmed**. The user must approve the foundation before it is used in external messages.

### B. Sales Plan Studio

A strategy workspace that produces a 30/60/90-day sales plan, not a disconnected list of ideas.

Outputs include:

- revenue target, average contract value, win-rate, pipeline-coverage, and activity assumptions;
- target segments and account tiers;
- channel mix: warm introductions, email, phone, LinkedIn/manual social, partners, events, inbound follow-up;
- campaign themes and offers by segment;
- weekly capacity plan, ownership, and calendar blocks;
- leading metrics and review cadence;
- risks, experiments, and the evidence needed to validate them.

The plan should allow scenario modeling: “If we need $300k in new ARR at a $15k ACV and a 20% win rate, how many qualified opportunities and target accounts are required?” Assumptions stay editable and are visibly marked.

### C. Account and buyer workspace

Each account page combines research, relationship context, a stakeholder map, outreach history, active opportunities, and next actions. The AI creates a short account brief:

- why this account fits the ICP;
- relevant public signals (with source links and dates);
- likely operational hypotheses clearly marked as hypotheses;
- potential buyer roles and an influence map;
- relevant customer proof from the approved library;
- recommended outreach angle and a disqualification reason where appropriate.

Research should be enrichable through approved sources and user-provided data. It should never imply private data access or present speculative facts as truth.

### D. Outreach Composer and sequence planner

This is a campaign planner and quality gate, not an unlimited email generator.

For each target and channel, it builds:

- message objective (permission, relevance, meeting, re-engagement—not “close”);
- a personalized opening based on a cited signal or a safe role/industry hypothesis;
- concise problem framing, outcome, proof, and low-friction call to action;
- 3–5 step sequence with timing, stop conditions, and a different reason to respond at each step;
- call opener, voicemail, LinkedIn/manual touchpoint, and reply branches;
- deliverability and compliance checks: unsubscribe, suppression lists, sender health, prohibited claims, excessive personalization, and duplicate contact protection.

The AI offers variants and explains their intent. It does not send external communications by itself in the initial release; a user reviews and approves before sending through an integrated provider.

### E. The Checklist Engine — the product’s centre of gravity

Every checklist is a reusable, configurable playbook instantiated for a company, campaign, account, or opportunity. It is designed to be used in the flow of work on desktop and mobile.

Each item contains:

- a purpose and plain-language instruction;
- an input field, evidence capture, or completion control;
- a suggested AI action (draft, calculate, research, coach, summarize);
- required/optional status and a stage gate;
- a “why this matters” explanation and examples;
- links to related proof, templates, and prior notes.

The engine supports three modes:

| Mode | When used | Experience |
|---|---|---|
| **Prepare** | Before planning, outreach, or a meeting | Full checklist with research, drafting, and review. |
| **Live** | During a call or pitch | Minimal, large-text, stage-aware prompts; quick note buttons; timer and silence cue. |
| **Review** | After an interaction | AI transcript/note extraction, missing-evidence flags, next-action confirmation, and coaching. |

Progress is not a vanity percentage. It answers, “Is this ready to advance?” A seller can override a warning, but must state a reason; that creates useful coaching data rather than rigid bureaucracy.

### F. Live Call Copilot

For connected calls or user notes, the copilot presents the active stage and only the next useful prompt. It can transcribe with appropriate consent, capture data, detect topics, and draft notes. It should not try to run the conversation or speak on behalf of the rep.

Useful live features:

- opening agenda/permission prompt;
- discovery questions mapped to what is still unknown;
- a visible current-state → desired-state → gap panel;
- calculator for opportunity value and cost of inaction, using buyer-confirmed inputs;
- speaker/stakeholder and decision-process reminders;
- objection assistant: validate, isolate, diagnose missing confidence, then suggest a question;
- presentation guardrail: prompt the seller to summarize findings and ask permission before showing a solution;
- pricing/close cue with a deliberate pause timer and two concrete next-step options;
- one-click capture of commitments, owner, due date, and follow-up promise.

The source frameworks’ conversational mechanics become prompts—not scripts that impersonate familiarity. For example: “I know I caught you at a busy time. Is now a bad time for a brief reason for my call?” is acceptable; pretending to know a cold prospect is not.

### G. Opportunity workspace, proposal, and mutual action plan

Once discovery is meaningful, an opportunity page turns confirmed evidence into a buyer-relevant plan:

- qualification dashboard and buying-belief confidence map;
- stakeholder / champion / blocker map;
- value case: baseline, target, gap, assumptions, and cost of delay;
- solution map: each solution element linked to a confirmed roadblock;
- proof plan: case studies, security/technical materials, references, and approval status;
- proposal generator with editable scope, terms, options, assumptions, and implementation plan;
- mutual action plan: decision date, approvals, tasks, owners, dependencies, and next meeting;
- red flags: single-threading, no economic impact, no decision process, unclear next step, low adoption capacity, or unverified claims.

The platform must allow a rep to nurture or disqualify a deal explicitly. It should not pressure every conversation toward a close.

### H. Objection and deal-diagnosis coach

When a prospect says “too expensive,” “send information,” “we need to think,” or “we’ll build it internally,” the platform does not merely retrieve a rebuttal. It asks the seller to assess the likely root cause:

| Buyer statement | Possible missing evidence / belief | Recommended response pattern |
|---|---|---|
| “It’s too expensive.” | Unquantified impact, weak value case, or wrong budget owner. | Acknowledge; isolate whether value/fit or commercial structure is the issue; revisit buyer-confirmed impact. |
| “Send me information.” | Insufficient relevance or unclear desired outcome. | Offer a focused resource; ask what decision or metric it should help them assess; agree on a review point. |
| “We need to think.” | Unresolved risk, stakeholder, priority, or decision process. | Ask what specifically needs to become true to decide and who needs to be involved. |
| “We can do it in-house.” | Internal capability/time assessment has not been explored. | Explore current approach, capacity, trade-offs, and what a successful internal plan would require. |

It uses the seven buying beliefs from `part2.md` as a **diagnostic lens**, not a manipulative scorecard: current pain, target goal, internal roadblock, strategic approach, trust in provider, implementation confidence, and legitimate timing/priority.

### I. Manager cockpit and revenue diagnostics

Leaders see a funnel that explains causes, not just totals:

- accounts by tier, channel, sequence, and response quality;
- response speed for inbound leads;
- discovery completion and evidence quality by rep;
- stage conversion, time-in-stage, no-next-step rate, and reason codes;
- most common objections mapped to missing evidence or playbook gaps;
- source/campaign quality and disqualification reasons;
- coaching queue with clips/notes, not surveillance-style ranking;
- experiments: message angle, segment, offer, and proof comparison.

This makes it possible to distinguish “we need more leads” from “we respond too slowly,” “we target the wrong accounts,” “we pitch before discovery,” or “our offer lacks proof.”

## 6. Canonical checklists

These are the initial built-in playbooks. Users can clone, customize, and make fields required for their sales motion.

### 6.1 Sales foundation checklist (one-time, revisited quarterly)

- [ ] Define the product/service in one sentence: customer, problem, mechanism, and outcome.
- [ ] List the top 3 customer outcomes that can be supported with evidence.
- [ ] Identify ICP firmographics, buying triggers, and explicit disqualifiers.
- [ ] Map economic buyer, champion, end user, technical evaluator, and procurement/legal roles.
- [ ] Document the buyer’s current alternatives: status quo, internal build, competitor, and manual workaround.
- [ ] Describe differentiated mechanism—not only features.
- [ ] Upload/approve proof: case studies, results, testimonials, security/integration facts, references.
- [ ] Define package scope, implementation effort, capacity constraints, and pricing guardrails.
- [ ] Collect common objections and the evidence required to answer each honestly.
- [ ] Set pipeline stages, stage exits, CRM fields, service-level response times, and disqualification criteria.
- [ ] Approve claims allowed in external outreach and claims requiring verification.

### 6.2 Sales plan checklist (monthly/quarterly)

- [ ] Set revenue target, period, ACV assumptions, expected win rate, and sales-cycle length.
- [ ] Calculate required closed-won deals, qualified opportunities, meetings, and target accounts.
- [ ] Choose no more than 2–3 priority segments and specify their observable buying triggers.
- [ ] Define account tiers and research depth for each tier.
- [ ] Set channel mix and weekly capacity by owner.
- [ ] Build campaign themes: problem hypothesis, proof, offer, CTA, and stop conditions.
- [ ] Define inbound response SLA and routing owner.
- [ ] Pick 1–3 experiments and their success criteria.
- [ ] Schedule weekly pipeline review and monthly learning review.
- [ ] Identify risks: lack of proof, product gap, capacity, deliverability, or unclear positioning.

### 6.3 Account and cold outreach checklist

- [ ] Confirm account fits the ICP; record why it is a fit and why now.
- [ ] Validate recipient role, contact source, jurisdiction, and allowed outreach basis.
- [ ] Check suppression/opt-out status and duplicate contacts.
- [ ] Capture a public, relevant signal with source and date—or use a clearly labelled role-based hypothesis.
- [ ] Select a single problem/outcome angle relevant to that person.
- [ ] Select credible proof appropriate to the segment; remove any unverified claim.
- [ ] Draft a concise, human message with one low-friction CTA.
- [ ] Define the sequence’s purpose, timing, reply branches, and stop conditions.
- [ ] Run deliverability, tone, privacy, compliance, and hallucination checks.
- [ ] Require human approval before send; log the activity and next review date.

### 6.4 Cold-call preparation and live checklist

**Before calling**

- [ ] Know why this account, this role, and why now.
- [ ] Prepare one permission-based opener and one short relevance statement.
- [ ] Know one verified proof point and one honest reason the conversation may not be a fit.
- [ ] Choose the single discovery objective for this call.
- [ ] Review the account’s previous touches, stakeholder context, and promised follow-up.
- [ ] Prepare a respectful exit and a follow-up option.

**During the call**

- [ ] Ask for permission and set a brief agenda; do not use deceptive familiarity.
- [ ] Understand the current workflow/problem before describing the product.
- [ ] Ask about operational impact: who/what is affected, frequency, and consequence.
- [ ] Explore desired outcome, priority, and time horizon.
- [ ] Identify root cause, prior attempts, alternatives, and constraints.
- [ ] Establish stakeholders, decision process, budget approach, and timing where appropriate.
- [ ] Summarize what was heard and ask the buyer to correct it.
- [ ] Ask permission to explain only the solution elements relevant to confirmed needs.
- [ ] Link each solution point to a buyer-stated problem and proof.
- [ ] Surface implementation/adoption concerns before closing.
- [ ] Agree on one specific next step with owner, date, purpose, and participants.
- [ ] Pause after the question; listen rather than filling silence.

**After the call**

- [ ] Confirm facts versus hypotheses in the deal record.
- [ ] Log pain, target, metric, roadblock, stakeholders, decision process, objections, and commitments.
- [ ] Send a factual recap with agreed actions—not a generic brochure.
- [ ] Create tasks and calendar holds; set a follow-up trigger.
- [ ] Flag missing evidence and update the next-call checklist.

### 6.5 Discovery-to-proposal checklist

- [ ] Current state is described with at least two buyer-confirmed facts or metrics.
- [ ] Desired state is explicit, measurable, and time-bound.
- [ ] Gap is calculated; assumptions are transparent.
- [ ] Cost of inaction is buyer-confirmed or clearly recorded as an estimate.
- [ ] Root cause and prior attempts are understood.
- [ ] Decision process, stakeholders, procurement/security requirements, and timing are mapped.
- [ ] Provider fit, delivery capacity, and implementation responsibilities are validated.
- [ ] Solution scope maps directly to confirmed roadblocks.
- [ ] Proposal includes exclusions, assumptions, outcomes, proof, implementation, price/options, and next decision step.
- [ ] Mutual action plan has named owners and dates.

### 6.6 Close, handoff, renew, or disqualify checklist

- [ ] Confirm commercial terms, scope, stakeholder approval, and signature path.
- [ ] Confirm implementation owner, timeline, access/dependencies, and success metric.
- [ ] Handoff the buyer’s stated goals, constraints, promises, and risks to delivery.
- [ ] If stalled, classify the reason with evidence and choose nurture, recycle, or close-lost.
- [ ] If disqualified, record reason and avoid further inappropriate outreach.
- [ ] Feed recurring objections, lost reasons, and proof gaps back into the Sales Foundation.

## 7. How the AI should work

### AI roles

| AI role | What it does | What it must not do |
|---|---|---|
| Foundation strategist | Interviews the user and proposes positioning, ICP, offer, and plan. | Invent market evidence or make unsupported outcome guarantees. |
| Research assistant | Summarizes authorized public/user data with citations and dates. | Treat inference as fact or use sensitive personal data. |
| Outreach editor | Produces channel-specific drafts and quality checks. | Send messages autonomously, evade spam filters, or bypass opt-outs. |
| Call copilot | Surfaces the next discovery prompt, captures notes, and assists with objections. | Manipulate the buyer, make commitments, or take control of the call. |
| Deal analyst | Extracts structured evidence and diagnoses missing qualification. | Change CRM truth silently or score people as facts without explainability. |
| Coach | Gives specific, evidence-linked feedback and practice simulations. | Shame reps or make opaque performance decisions. |

### Structured state model

The AI should maintain a structured deal record in addition to a conversation transcript. Minimum fields:

```json
{
  "account_fit": {"status": "hypothesis", "reason": ""},
  "stakeholders": [],
  "current_state": {"facts": [], "metrics": []},
  "desired_state": {"facts": [], "metrics": [], "target_date": null},
  "value_gap": {"amount": null, "currency": null, "assumptions": [], "buyer_confirmed": false},
  "roadblocks": [],
  "prior_attempts": [],
  "cost_of_inaction": {"amount": null, "cadence": "monthly", "confidence": "estimate"},
  "buying_beliefs": {},
  "decision_process": {"criteria": [], "people": [], "date": null},
  "objections": [],
  "commitments": [],
  "next_step": {"owner": null, "date": null, "purpose": null},
  "evidence_sources": []
}
```

The system uses this state to decide what to ask next. It should never block a seller from proceeding, but should show: **Ready**, **Proceed with caution**, or **Missing critical evidence**, with a clear explanation.

### Stage-aware conversation model

1. **Frame and permission:** establish purpose, agenda, and mutual fit.
2. **Current-state discovery:** establish the operational reality and measurable impact.
3. **Desired state and gap:** define goal, timeline, and value opportunity.
4. **Roadblocks and alternatives:** understand why this is unsolved and what else the buyer may do.
5. **Priority and feasibility:** establish consequences of delay, decision process, and implementation capacity.
6. **Alignment:** summarize and ask permission to prescribe.
7. **Prescriptive presentation:** map product capabilities and proof to confirmed needs only.
8. **Commitment or diagnosis:** secure a concrete next step or identify the unresolved concern and return to the relevant stage.

The sources’ finite-state logic is valuable here, but the production platform should use **soft guardrails**. Real sales conversations are not linear; users need to revisit topics without being trapped by an algorithm.

## 8. Information architecture and core screens

### Main navigation

- **Today:** priority actions, upcoming calls, inbound SLA clock, stalled deals, and checklist progress.
- **Plan:** Sales Foundation, 30/60/90 plan, ICP, offer/package builder, campaigns, and experiments.
- **Accounts:** target accounts, contacts, research, sequences, and account plans.
- **Deals:** pipeline board, deal evidence records, mutual action plans, proposals, and health alerts.
- **Calls:** preparation briefs, live copilot, recordings/notes, review, and coaching.
- **Playbooks:** checklists, scripts, templates, proof library, and objection maps.
- **Insights:** funnel diagnostics, conversion, quality, experiments, and enablement gaps.
- **Settings:** integrations, data/consent, roles, compliance policies, and customization.

### The “Today” screen

This should be the daily habit-forming screen, showing only work that matters now:

- overdue buyer commitments and inbound leads nearing SLA;
- calls that need preparation, with a “Start call checklist” button;
- outreach drafts waiting for review;
- deals with no next step or material missing evidence;
- suggested next best action, its rationale, and an override option.

## 9. Integrations and technical scope

### MVP integrations

- CRM: HubSpot and Salesforce import/sync; CSV as a baseline.
- Calendar: Google Calendar and Microsoft 365.
- Email: Gmail/Microsoft 365 for draft/review/send workflows.
- Calling/meeting: dialer or meeting platform integration for notes/transcript where consent and policies allow.
- Knowledge: file upload, Notion/Google Drive connectors, and a vetted proof library.

### System architecture

| Layer | Responsibility |
|---|---|
| Application layer | Workspaces, checklists, approvals, permissions, notifications, and CRM-style objects. |
| Data layer | Tenant-isolated company, account, contact, opportunity, activity, evidence, consent, and template records. |
| AI orchestration | Retrieval from approved company knowledge; structured extraction; citation-aware generation; tool calls; model routing; human approval gates. |
| Rules engine | Stage exit criteria, checklist requirements, SLA timers, suppression, channel policies, and next-best-action rules. |
| Integration layer | OAuth, bidirectional CRM sync, email/calendar/call events, deduplication, retries, audit log. |
| Analytics layer | Event taxonomy, funnel metrics, experiment attribution, evidence-quality scoring, and dashboards. |

### Non-negotiable controls

- tenant and role-based access control;
- encryption in transit and at rest;
- consent/recording notices, opt-out and suppression propagation;
- provenance on generated research and claims;
- human approval for external messages and price/proposal commitments;
- immutable audit events for sends, edits, consent, and AI actions;
- configurable data retention and deletion;
- administrative controls for outbound frequency, working hours, and jurisdiction.

## 10. MVP: what to build first

### MVP goal

Prove that a small B2B team can go from “we know our product” to “we are running better prepared outbound and discovery conversations” in one working day.

### MVP release scope

1. Guided Company & Offer intake and generated Sales Foundation.
2. Configurable checklist engine with Prepare, Live, and Review modes.
3. Sales Plan Studio with a basic funnel/capacity calculator.
4. Account workspace and manually assisted research brief.
5. Human-approved cold-email/call-sequence generator.
6. Call preparation brief, live note mode, post-call summary, and structured evidence extraction.
7. Basic opportunity health view: missing evidence, next-step quality, objection reasons, stage readiness.
8. HubSpot import/export plus Google/Microsoft calendar and email-draft integrations.

### Explicitly defer

- autonomous cold calling or autonomous email sending;
- a full replacement for enterprise CRM, marketing automation, or sales engagement platforms;
- advanced revenue forecasting;
- automatic web scraping with uncertain data provenance;
- opaque scoring or surveillance features;
- custom enterprise procurement/security workflows.

### Why this MVP is useful

It delivers the central loop: **plan → prepare → converse → capture evidence → take next action → learn**. That is the smallest coherent product capable of improving real sales behavior rather than producing isolated AI text.

## 11. Product roadmap

| Phase | Outcome | Key additions |
|---|---|---|
| **0. Design validation** | Verify the workflow and checklist language with 8–12 B2B sellers/founders. | Clickable prototype, concierge foundation build, call-review sessions, measure time-to-value. |
| **1. MVP** | A team can build its foundation, plan outreach, run checklists, and capture deal evidence. | Scope listed above. |
| **2. Team operating system** | Managers can standardize and improve a repeatable motion. | Custom playbooks, coaching, CRM bidirectional sync, team analytics, proposal/mutual action plan. |
| **3. Intelligence and scale** | The platform learns which actions improve conversion for each motion. | Experiment analysis, deeper enrichment, persona-specific coaching, stronger recommendations, more integrations. |
| **4. Enterprise readiness** | Controlled deployment in complex organizations. | SSO/SCIM, advanced permissions, governance, regional policies, data residency options, custom objects. |

## 12. Success measures

### User value

- Time from signup to an approved Sales Foundation and first usable campaign.
- Percentage of scheduled calls with completed preparation checklist.
- Percentage of completed calls with a buyer-confirmed next step, owner, and date.
- Discovery evidence completeness at the point of proposal.
- Seller-reported confidence and time saved without a reduction in message quality.

### Revenue-motion health

- Positive reply and meeting-booked rate by segment/channel (not raw send volume).
- Inbound response time against SLA.
- Conversion from first conversation to qualified opportunity.
- Proposal-to-close conversion and sales-cycle duration.
- “No decision,” price, competitor, and in-house loss reasons over time.
- Reduction in deals with missing stakeholders, no quantified problem, or no next step.

### Safety and quality

- Share of external claims with source/proof attached.
- Opt-out/suppression accuracy and policy violations.
- Hallucination reports and corrected knowledge records.
- AI recommendations accepted, edited, overridden, and reasons for override.

## 13. Key product decisions to validate early

1. **Wedge:** Is the first buyer more motivated by cold outbound, founder-led discovery, or manager-led consistency? Build one primary workflow first.
2. **CRM posture:** Integrate with existing CRMs rather than replace them; selling “CRM replacement” would make the product slower to adopt and blur its advantage.
3. **Call recording:** Make live guidance valuable even without recording, because many users will not have permission or policy approval to record calls.
4. **Checklist intensity:** Required fields should be limited to evidence that genuinely improves a decision. Excessive gating will turn the product into admin work.
5. **Channel policy:** Keep outreach human-approved until there is strong trust, deliverability control, and compliance maturity.
6. **Verticalization:** Begin horizontal for B2B service/SaaS, then offer playbook packs for agencies, IT services, recruiters, or other validated segments.

## 14. The differentiated position

The market has abundant point tools: CRMs remember, sales-engagement tools send, conversation-intelligence tools record, and AI writers draft. OpenRiverStack sits above them as the **evidence-led operating system for a sales motion**.

Its differentiation is not “AI writes better emails.” It is the closed loop between:

```text
Company truth → account relevance → prepared conversation → buyer-confirmed evidence
      ↑                                                            ↓
      └──── improved positioning, playbooks, coaching, and plans ─┘
```

The checklist engine makes that loop usable at the point of work. The AI makes it adaptive rather than static. The structured evidence record makes the platform trustworthy and measurable.

## 15. Recommended next step

Create a clickable prototype around one complete journey: **onboard a B2B company → approve its sales foundation → select an account → prepare and send a reviewed cold email → run a discovery call checklist → generate a follow-up and update the deal evidence.**

Test it with 8–12 target users before building integrations or automation. The test should answer one question: *Does this reduce uncertainty and improve the quality of the seller’s next action enough that they want to use it every day?*
