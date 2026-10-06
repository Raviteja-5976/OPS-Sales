# OpenRiverStack Design System

> **Design language:** A warm, high-density revenue cockpit that feels like a smart sales leader sitting beside the seller—not an AI chatbot talking at them.

OpenRiverStack is an **evidence-led operating system for sales execution**. Its visual language must communicate confidence, precision, intelligence, warmth, and forward motion while avoiding the generic visual patterns of modern AI SaaS.

---

## 1. Design Philosophy

### Core idea

OpenRiverStack should feel like:

**Linear × Bloomberg Terminal × premium consulting software × sales cockpit**

Not as a visual copy, but as a combination of qualities:

- **Linear:** precise hierarchy, excellent density, fast interaction.
- **Bloomberg:** information has meaning; data is functional rather than decorative.
- **Premium consulting:** confidence, restraint, editorial typography, strong whitespace.
- **Sales cockpit:** the next action is always obvious.

The primary question every screen should answer is:

> **"What should I do next, and why?"**

Do not design OpenRiverStack as a dashboard collection. Design it as a **decision-making workspace**.

---

# 2. Brand Personality

OpenRiverStack should be:

- **Confident** — never loud.
- **Precise** — never sterile.
- **Intelligent** — never robotic.
- **Warm** — never childish.
- **Opinionated** — never aggressive.
- **Evidence-driven** — never bureaucratic.
- **Professional** — but not corporate-looking.
- **Human** — without becoming playful or gimmicky.

### Brand statement

> **OpenRiverStack should feel like a very smart sales leader sitting beside you.**

---

# 3. Visual Identity

The existing OpenRiverStack logo establishes the visual foundation:

- Gold / yellow
- Amber
- Orange
- Burnt orange
- Deep brown
- Warm cream

The brand should **not** use these colors everywhere.

The logo colors are functional accents, not decoration.

### Color distribution

Use approximately:

- **70% neutral:** cream, white, warm gray.
- **20% dark brand:** deep brown / charcoal.
- **10% brand accents:** gold, amber, orange.

The application should feel mostly neutral with strategic moments of brand color.

---

# 4. Color System

## 4.1 Core Colors

| Token | Hex | Usage |
|---|---|---|
| `brand-gold` | `#FFCB01` | Primary action, intelligence signal |
| `brand-gold-hover` | `#F4B900` | Hover / active primary action |
| `brand-amber` | `#F5A900` | Secondary emphasis |
| `brand-orange` | `#E87932` | Attention / active state |
| `brand-burnt` | `#D9673E` | Critical / strong warning |
| `brand-brown` | `#482311` | Navigation, headings, strong UI |
| `brand-brown-dark` | `#241812` | Primary text |
| `background` | `#FBFAF7` | Main application background |
| `surface` | `#FFFFFF` | Cards / panels |
| `surface-warm` | `#FFF8E7` | Brand-tinted panels |
| `text-primary` | `#241812` | Main text |
| `text-secondary` | `#746A62` | Supporting text |
| `text-muted` | `#9A9189` | Metadata / tertiary information |
| `border` | `#E9E3DA` | Borders / dividers |
| `border-strong` | `#D9D0C5` | Important separators |
| `success` | `#26734D` | Positive / confirmed |
| `warning` | `#C98200` | Warning |
| `error` | `#B84A3A` | Error / destructive |
| `info` | `#5B6B73` | Neutral information |

---

## 4.2 Semantic Color Meaning

Colors must have meaning.

### Gold

**Meaning:** actionable intelligence.

Use for:

- Next Best Action
- primary CTA
- AI suggestions
- active progress
- important decisions
- selected workflow states

Gold should communicate:

> **"OpenRiverStack has something useful for you here."**

### Brown

**Meaning:** truth, foundation, authority.

Use for:

- navigation
- headings
- company-provided information
- strong text
- core structural UI

### Orange

**Meaning:** attention.

Use for:

- missing evidence
- deal risk
- unresolved questions
- stalled opportunities

### Burnt Orange

**Meaning:** critical action required.

Use sparingly for:

- serious blockers
- compliance issues
- invalid assumptions
- critical deal risks

### Green

**Meaning:** confirmed / healthy / complete.

Do not overuse green. Confirmation should remain visually quiet.

---

# 5. Evidence Is the Core Visual Language

OpenRiverStack is fundamentally an **evidence system**.

The UI should therefore communicate not only:

> "What do we know?"

but:

> **"How do we know it?"**

Every important fact should be capable of displaying provenance.

Example:

```text
Current reporting takes 17 hours/week

● Buyer confirmed
```

or:

```text
Likely expanding into Europe

◐ Public research
```

or:

```text
Potential integration blocker

○ AI hypothesis
```

---

## 5.1 Provenance States

| State | Symbol | Meaning |
|---|---|---|
| Buyer confirmed | `●` | Explicitly confirmed by buyer |
| Company provided | `●` | Provided by OpenRiverStack workspace |
| Public research | `◐` | Supported by public source |
| AI hypothesis | `○` | Generated hypothesis |
| Unknown | `—` | Not established |

Use subtle semantic colors rather than large badges.

Provenance should never visually overpower the information itself.

---

# 6. Evidence Rail

The **Evidence Rail** is a signature OpenRiverStack component.

Example:

```text
DEAL EVIDENCE
────────────────────────────────

✓ ICP FIT
  Confirmed

✓ CURRENT PROBLEM
  17 hrs/week lost to manual reporting

✓ DESIRED OUTCOME
  Reduce reporting effort by 60%

◐ VALUE
  ₹2.4L estimated annual impact
  Not buyer-confirmed

○ DECISION PROCESS
  Missing

○ IMPLEMENTATION
  Missing
```

The Evidence Rail should appear in:

- Deal pages
- Call review
- Discovery
- Proposal preparation
- Account research
- Manager insights

It is one of the primary ways OpenRiverStack differentiates from conventional CRMs.

---

# 7. Evidence Journey

Do not make the primary sales pipeline look like a generic CRM Kanban.

Represent the journey as evidence progression:

```text
FIT ───── PROBLEM ───── VALUE ───── DECISION ───── CLOSE
```

Example:

```text
FIT          PROBLEM       VALUE       DECISION      CLOSE
 34             27           19            11           7
```

Each stage should represent **confidence/evidence**, not simply activity.

Clicking a stage should reveal:

- What is confirmed.
- What is inferred.
- What is missing.
- Why the missing information matters.
- Recommended next action.

---

# 8. Next Best Action

Every major workspace should have a **Next Best Action**.

This is another signature component.

Example:

```text
NEXT BEST ACTION

Ask about procurement before
sending the proposal.

Why:
The economic buyer is identified,
but the approval path is unknown.

[ Prepare question → ]
```

Structure:

```text
WHAT → WHY → ACTION
```

Never show a recommendation without explaining its rationale.

Users must be able to override recommendations.

---

# 9. AI Design Language

Do not use generic AI visual patterns everywhere.

Avoid:

- Purple gradients
- Giant sparkle icons
- "AI MAGIC" labels
- Chatbot-first interfaces
- Floating assistant bubbles on every screen
- Excessive animated gradients

AI should be **quietly embedded into the workflow**.

Examples:

```text
⚡ Suggested next question
```

```text
◐ Missing evidence
```

```text
Generate follow-up
```

```text
Explain why
```

The user should feel:

> **"OpenRiverStack helps me sell better."**

Not:

> **"I am using an AI wrapper."**

---

# 10. AI Visual Accent

Use the logo's flowing ribbon concept as inspiration for AI interaction.

The AI visual language can use:

- Small gold signals
- Thin flowing lines
- Warm highlighted surfaces
- Subtle gold borders
- Directional motion

Do not literally put the logo shape everywhere.

The visual metaphor is:

> **AI creates forward movement through the sales process.**

---

# 11. Layout Philosophy

OpenRiverStack should use a **dense but breathable** layout.

Avoid excessive empty space.

Avoid excessive information density.

The ideal balance is:

> **Information-rich, visually calm.**

### Recommended desktop structure

```text
┌──────────────┬──────────────────────────────────────────────┐
│              │                                              │
│   Sidebar    │               Main workspace                 │
│              │                                              │
│  Navigation  │                                              │
│              │                                              │
│              │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

Recommended sidebar width:

- 220–250px expanded
- 64–72px collapsed

Main content should generally use:

- 24–32px outer padding
- 16–24px internal spacing
- 12–16px panel gaps

---

# 12. Do Not Make Everything a Card

One of the biggest rules of OpenRiverStack:

> **Not everything is a card.**

Avoid:

```text
┌────────────┐
│   Card     │
└────────────┘

┌────────────┐
│   Card     │
└────────────┘

┌────────────┐
│   Card     │
└────────────┘
```

Instead use:

- editorial sections
- dividers
- inline metadata
- rails
- timelines
- tables
- structured lists
- panels
- contextual surfaces

Cards should represent actual boundaries.

---

# 13. Border and Shadow Rules

Prefer borders over shadows.

Default:

```css
border: 1px solid #E9E3DA;
```

Use shadows only for floating UI:

- dropdowns
- command palette
- dialogs
- popovers
- floating call controls

Avoid heavy shadows.

The product should feel:

> **Precise and grounded.**

---

# 14. Border Radius

Avoid the "everything is 24px rounded" AI SaaS style.

Recommended:

| Element | Radius |
|---|---:|
| Input | 8px |
| Button | 8–10px |
| Small panel | 10px |
| Card | 12px |
| Large workspace | 12–16px |
| Modal | 14–16px |
| Badge | 999px |

The UI should have **controlled geometry**.

---

# 15. Typography

Use a clean modern sans-serif as the primary font.

Recommended options:

1. **Geist**
2. **Inter**
3. **Manrope**

For technical metadata and numerical information, use:

- Geist Mono
- IBM Plex Mono

Suggested hierarchy:

```text
Display:       32–40px / 700
Page heading:  24–28px / 650
Section:       16–18px / 650
Body:          14–15px / 400–500
Metadata:      12–13px / 500
Mono:          11–13px
```

Do not overuse bold text.

Hierarchy should come from:

- size
- spacing
- weight
- color
- position

---

# 16. Numbers Are Important

OpenRiverStack contains important numerical information:

- pipeline
- revenue
- ACV
- win rate
- evidence confidence
- sales cycle
- response time

Numbers should feel deliberate.

Example:

```text
₹18.4L
Pipeline

72%
Evidence confidence

14
Active opportunities
```

Use a consistent numerical style throughout the application.

---

# 17. Navigation

Do not use generic labels like:

```text
Dashboard
Analytics
CRM
AI
```

Recommended navigation:

```text
OPENRIVERSTACK

TODAY
  Command Center

REVENUE
  Accounts
  Opportunities
  Pipeline

EXECUTION
  Sequences
  Calls
  Playbooks

INTELLIGENCE
  Deal Signals
  Insights
  Coaching

FOUNDATION
  ICP
  Positioning
  Proof Library

────────────────

  Search        ⌘ K
  Settings
```

The terminology should reinforce the product philosophy.

---

# 18. Today / Command Center

The home screen should be **Today**, not Dashboard.

It answers:

> **"What moves revenue today?"**

Example:

```text
GOOD MORNING

Here's what moves revenue today.

────────────────────────────────────

NEXT BEST ACTION

Acme Corp
Discovery · 10:30 AM

⚠ Missing economic impact

[ Prepare call → ]

────────────────────────────────────

TODAY'S SIGNALS

14 Active opportunities
6 Need action
3 Stalled

────────────────────────────────────

DEALS NEEDING ATTENTION

Acme Corp       Missing decision process
Globex          No quantified problem
Nova Labs       Follow-up overdue
```

The home screen should be action-oriented rather than analytics-heavy.

---

# 19. Deal Workspace

Do not recreate Salesforce.

The deal workspace should answer:

1. What do we know?
2. What don't we know?
3. How confident are we?
4. What should happen next?

Example:

```text
ACME CORP
Enterprise Expansion

₹18,00,000
██████████████░░ 72% evidence

DISCOVERY ─── ALIGNMENT ─── DECISION

────────────────────────────────

WHAT WE KNOW

Current state
Manual reporting → 17 hrs/week
● Buyer confirmed

Desired state
< 6 hrs/week
● Buyer confirmed

Economic impact
₹2.4L/year
◐ Estimate

Decision maker
VP Operations
● Identified

────────────────────────────────

WHAT WE DON'T KNOW

⚠ Procurement process
⚠ Implementation owner
⚠ Final decision date

────────────────────────────────

NEXT BEST ACTION

Ask about procurement before
sending the proposal.

[ Prepare question ]
```

---

# 20. Checklist Engine

The checklist is the **centre of gravity** of OpenRiverStack.

It should never look like a generic task list.

Bad:

```text
☐ Ask about pain
☐ Ask about budget
☐ Ask about timeline
☐ Ask about decision maker
```

Good:

```text
DISCOVERY

01  CURRENT STATE

What happens today?

┌─────────────────────────────┐
│ Capture buyer response...   │
└─────────────────────────────┘

Evidence required

● Workflow
● Frequency
○ Business impact

2 / 3

─────────────────────────────

02  DESIRED STATE

What would better look like?

[ Continue → ]
```

The checklist should feel like a **guided cockpit**.

---

# 21. Checklist Modes

## Prepare

Before:

- Research
- Meeting preparation
- Account context
- Questions
- Proof selection
- Objective

## Live

During:

- Current stage
- Next useful question
- Evidence capture
- Notes
- Objection handling
- Commitments

## Review

After:

- Evidence extraction
- Fact/hypothesis classification
- Missing evidence
- Next action
- Follow-up
- Coaching

---

# 22. Live Call Mode

Live Call should be a **focused environment**.

Remove most navigation.

Example:

```text
┌───────────────────────────────────────────────────────┐
│ ACME CORP                              14:32           │
│ Discovery · Stage 2                                  │
├───────────────────────────────────────────────────────┤
│                                                       │
│                    CURRENT STATE                     │
│                                                       │
│        "How does the team handle this today?"        │
│                                                       │
│                                                       │
│ ───────────────────────────────────────────────────── │
│                                                       │
│ KNOWN                      STILL UNKNOWN              │
│                                                       │
│ ✓ Manual reporting        ○ Business impact           │
│ ✓ 17 hrs/week             ○ Decision process          │
│                           ○ Implementation             │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│ NEXT QUESTION                                         │
│                                                       │
│ "What happens when the reporting isn't completed     │
│  on time?"                                            │
│                                                       │
│ [ Ask this ] [ Another ] [ Capture note ]             │
└───────────────────────────────────────────────────────┘
```

The seller should never feel like they are operating a CRM during a call.

---

# 23. Call Copilot Rules

During a live call:

- Show one useful prompt at a time.
- Keep text large.
- Minimize navigation.
- Do not flood the screen with AI suggestions.
- Make notes extremely fast.
- Keep evidence visible.
- Make commitments easy to capture.
- Show the current stage.
- Show what is still unknown.
- Never take control of the conversation.

---

# 24. Opportunity Health

Avoid a single opaque "AI score."

Instead show component confidence:

```text
OPPORTUNITY HEALTH

ICP Fit              █████████░ 90%
Problem              ████████░░ 82%
Value                █████░░░░░ 51%
Stakeholders         ██████░░░░ 63%
Decision Process     ██░░░░░░░░ 21%
Implementation       ████░░░░░░ 42%
```

Every score must be explainable.

Clicking a score should reveal:

- Evidence
- Sources
- Missing information
- Reason for confidence
- Recommended action

---

# 25. Buying Belief Map

Use the seven buying beliefs as a diagnostic lens.

```text
CURRENT PAIN          ████████░░
TARGET GOAL           █████████░
INTERNAL ROADBLOCK    ██████░░░░
STRATEGIC APPROACH    █████░░░░░
TRUST                  ███████░░░
IMPLEMENTATION        ████░░░░░░
TIMING / PRIORITY     █████░░░░░
```

Never present this as:

> "The buyer is 63% likely to buy."

Instead:

> **"Evidence supporting this buying belief."**

---

# 26. Account Workspace

Account pages should combine:

- account fit
- public signals
- stakeholders
- outreach
- opportunities
- research
- proof
- next actions

Example structure:

```text
ACME CORP

ICP FIT
█████████░ 91%

WHY THIS ACCOUNT

• Enterprise reporting workflow
• Relevant operational team
• Known expansion signal

PUBLIC SIGNALS

Oct 02
Expansion announcement
Source →

Sep 28
New operations leadership
Source →

STAKEHOLDERS

Sarah · VP Operations
Raj · Finance
Alex · IT

NEXT BEST ACTION

Reach out to Operations with
the reporting-efficiency angle.
```

---

# 27. Outreach Composer

The Outreach Composer should look like a **quality-controlled workspace**, not an AI copy generator.

Structure:

```text
CAMPAIGN

Objective
Permission / Relevance / Meeting / Re-engagement

TARGET

VP Operations · Acme Corp

SIGNAL

New reporting initiative
Source: company announcement

ANGLE

Reduce reporting effort

PROOF

Approved customer evidence

MESSAGE

────────────────────────────

Draft...

────────────────────────────

QUALITY CHECK

✓ Relevant
✓ Source attached
✓ One CTA
✓ Human review required
✓ Suppression checked

[ Review & approve ]
```

The system should explain why the message exists.

---

# 28. Proposal Workspace

Proposal creation should be evidence-driven.

Structure:

```text
PROPOSAL READINESS

✓ Current state
✓ Desired state
✓ Value case
✓ Stakeholders
⚠ Procurement
✓ Scope
⚠ Implementation owner

READINESS
72%

[ Resolve missing evidence ]
```

Never allow a polished proposal to hide an incomplete discovery process.

---

# 29. Manager Cockpit

Managers should see **causes**, not vanity metrics.

Good:

```text
WHY DEALS STALL

32%  No decision process
24%  No quantified impact
18%  Single-threaded
14%  Weak proof
12%  Timing / priority
```

Better:

```text
TOP PLAYBOOK GAP

14 opportunities lack a
quantified problem.

Most affected:
Enterprise / Operations

Recommended action:

Update discovery checklist
with an impact question.

[ Improve playbook ]
```

This turns analytics into action.

---

# 30. Tables

Use tables when comparing structured information.

Avoid turning every table into a collection of cards.

Example:

```text
ACCOUNT          STAGE        EVIDENCE       NEXT ACTION

Acme Corp        Discovery    72%            Quantify impact
Globex           Proposal     91%            Confirm procurement
Nova Labs        Discovery    43%            Identify buyer
```

Tables should be:

- compact
- readable
- keyboard-friendly
- sortable
- filterable
- visually quiet

---

# 31. Empty States

Empty states should teach the product.

Bad:

```text
No accounts yet.
```

Good:

```text
NO TARGET ACCOUNTS

OpenRiverStack needs a few accounts to
start building your revenue motion.

Import from HubSpot or add your
first account manually.

[ Add account ]   [ Import CSV ]
```

Every empty state should explain:

- what is missing
- why it matters
- what the user can do next

---

# 32. Loading States

Avoid generic spinners whenever possible.

Use contextual progress.

Example:

```text
BUILDING SALES FOUNDATION

✓ Reading company information
✓ Identifying ICP signals
● Building positioning
○ Mapping objections
○ Preparing proof gaps
```

This communicates what OpenRiverStack is doing.

---

# 33. Motion Design

Animation should communicate **state and direction**, not decoration.

Use:

- 150–250ms transitions for normal UI
- subtle 250–400ms transitions for workspace changes
- progress animations when evidence changes
- directional movement when a deal advances
- subtle highlight when a new recommendation appears

Avoid:

- bouncing cards
- excessive gradients
- continuous animations
- decorative floating blobs
- excessive parallax

The product should feel fast.

---

# 34. Revenue Flow Motion

Use the logo's flowing shape as inspiration for transitions.

When an opportunity moves forward:

```text
FIT
 ↓
PROBLEM
 ↓
VALUE
 ↓
DECISION
 ↓
CLOSE
```

The transition should feel like **forward movement**, not a card teleporting.

---

# 35. Iconography

Use one icon family consistently.

Recommended:

- Lucide
- Phosphor

Icons should be:

- 16–20px
- thin/medium stroke
- monochrome by default
- brand-colored only when semantically meaningful

Do not use emojis as primary UI icons.

---

# 36. Command Palette

OpenRiverStack should have a powerful command palette.

Shortcut:

```text
⌘ K
```

Example:

```text
Search OpenRiverStack

────────────────────────────

Search accounts
Search deals
Search people
Search playbooks

────────────────────────────

Create account
Create opportunity
Start call preparation
Generate follow-up

────────────────────────────

Go to Today's actions
```

This supports power users and reinforces the operating-system metaphor.

---

# 37. Keyboard-first Interactions

Important workflows should support keyboard actions.

Examples:

```text
⌘ K       Command palette
G then A  Accounts
G then D  Deals
G then C  Calls
N         New item
/         Search
Esc       Close
```

Do not make the application mouse-dependent.

---

# 38. Responsive Design

## Desktop

Desktop is the primary experience.

Use:

- sidebar
- evidence rail
- multi-column workspaces
- dense tables
- keyboard shortcuts

## Tablet

Collapse:

- secondary panels
- evidence rail into drawer
- navigation into compact sidebar

## Mobile

Mobile should focus on execution:

- Today
- Calls
- Tasks
- Deal evidence
- Next Best Action
- Quick capture

Do not attempt to reproduce the entire desktop dashboard on mobile.

---

# 39. Dark Mode

Dark mode should be supported, but should **not** define the brand.

Do not simply invert colors.

Dark mode should use:

```text
Background      #17120F
Surface         #211A16
Surface raised  #2A211B
Text            #FFF8ED
Muted           #B6AAA0
Border          #40362E
Gold            #FFCB01
Orange          #E87932
```

The warm brown foundation should remain visible.

Avoid pure `#000000`.

---

# 40. Brand Gradient

The logo gradient may be used sparingly.

Suggested gradient:

```css
linear-gradient(
  135deg,
  #FFCB01 0%,
  #F5A900 38%,
  #E87932 68%,
  #482311 100%
)
```

Use it for:

- occasional hero visuals
- progress accents
- AI intelligence indicators
- marketing pages
- special brand moments

Do **not** use it as the default background of dashboards.

---

# 41. Marketing vs Product

The marketing website can be more expressive.

### Marketing

Use:

- logo gradient
- flowing paths
- large typography
- visual storytelling
- evidence journey illustrations
- warmer surfaces
- larger brand moments

### Product

Use:

- neutral background
- restrained gold
- information density
- evidence rails
- precise typography
- subtle motion

The product should feel calmer than the marketing site.

---

# 42. Component Signature

OpenRiverStack should be recognizable without the logo through these components:

1. **Evidence Rail**
2. **Next Best Action**
3. **Evidence Journey**
4. **Live Checklist**
5. **Buying Belief Map**
6. **Provenance Tags**
7. **Revenue Flow**

These seven components form the core visual identity.

---

# 43. Design Tokens

Example token structure:

```css
:root {
  --color-brand-gold: #FFCB01;
  --color-brand-gold-hover: #F4B900;
  --color-brand-amber: #F5A900;
  --color-brand-orange: #E87932;
  --color-brand-burnt: #D9673E;
  --color-brand-brown: #482311;
  --color-brand-brown-dark: #241812;

  --color-background: #FBFAF7;
  --color-surface: #FFFFFF;
  --color-surface-warm: #FFF8E7;

  --color-text-primary: #241812;
  --color-text-secondary: #746A62;
  --color-text-muted: #9A9189;

  --color-border: #E9E3DA;
  --color-border-strong: #D9D0C5;

  --color-success: #26734D;
  --color-warning: #C98200;
  --color-error: #B84A3A;
  --color-info: #5B6B73;

  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

# 44. What OpenRiverStack Must NOT Look Like

Avoid these patterns:

### Generic AI SaaS

- Purple gradients
- Sparkle icons everywhere
- AI chat as the home screen
- Giant "Ask AI" button
- Excessive rounded cards

### Generic CRM

- Salesforce-style dense forms
- Activity timeline as the primary experience
- Endless fields
- Pipeline as only Kanban columns
- Probability as the main deal health signal

### Generic Dashboard

- 12 KPI cards
- giant charts
- meaningless percentages
- charts without recommended actions
- vanity activity metrics

### Generic Productivity App

- excessive checkboxes
- gamification
- streaks
- points
- progress bars that measure completion instead of readiness

---

# 45. Core Design Rule

The most important rule:

> **Never show information merely because it is available. Show it because it changes a decision.**

Every element should answer one of:

- What do I know?
- How do I know it?
- What am I missing?
- Why does it matter?
- What should I do next?

If an element does not help answer one of these questions, reconsider whether it belongs on the screen.

---

# 46. The OpenRiverStack Interaction Model

The entire product should follow:

```text
KNOW
 ↓
ASK
 ↓
CAPTURE
 ↓
VERIFY
 ↓
DECIDE
 ↓
ACT
 ↓
LEARN
```

This should influence:

- screen layouts
- checklists
- AI recommendations
- call workflows
- deal stages
- analytics
- coaching

---

# 47. Core Product Loop

The visual experience should reinforce:

```text
Company Truth
      ↓
Account Relevance
      ↓
Prepared Conversation
      ↓
Buyer-confirmed Evidence
      ↓
Decision
      ↓
Next Action
      ↓
Learning
      ↓
Improved Sales Foundation
```

The interface should make this loop feel continuous.

---

# 48. Final Design Direction

OpenRiverStack should look like:

> **A warm, precise, high-density revenue cockpit with a cream and deep-brown foundation, restrained gold/orange intelligence signals, editorial typography, evidence-first information architecture, controlled geometry, and interfaces designed around the seller's next decision.**

It should feel **premium but practical**.

It should feel **intelligent without looking like an AI wrapper**.

It should feel **sales-specific without looking like another CRM**.

Most importantly:

> **The logo provides the color identity. The evidence system provides the product identity. The next-best-action workflow provides the interaction identity.**

---

# 49. First Prototype to Build

Do not design the entire application at once.

Build one polished end-to-end journey:

```text
ONBOARDING
    ↓
SALES FOUNDATION
    ↓
ACCOUNT
    ↓
ACCOUNT RESEARCH
    ↓
OUTREACH
    ↓
CALL PREPARATION
    ↓
LIVE CALL
    ↓
EVIDENCE CAPTURE
    ↓
FOLLOW-UP
    ↓
DEAL HEALTH
    ↓
NEXT BEST ACTION
```

The prototype should answer one question:

> **"Does OpenRiverStack reduce uncertainty and improve the quality of the seller's next action?"**

If the answer is yes, extend the design system across the rest of the platform.

---

# 50. Design North Star

### OpenRiverStack is not a CRM with AI.

### OpenRiverStack is not an AI copywriter.

### OpenRiverStack is not a call recorder.

### OpenRiverStack is not a dashboard.

**OpenRiverStack is an operating system for making better sales decisions.**

The UI should make that obvious before the user reads a single line of documentation.
