# OpenRiverStack

An AI sales workbench that turns a company's product knowledge into an evidence-led, repeatable sales motion. It implements the MVP in [SALES_PLATFORM_PLAN.md](SALES_PLATFORM_PLAN.md), using the methodology in [part1.md](part1.md) and [part2.md](part2.md).

**Stack:** Next.js 15 (App Router, server actions) · Supabase (Postgres, Auth, row-level security) · OpenAI · Tailwind CSS v4 · AWS Amplify Hosting.

## Tenancy model

- Each user belongs to **exactly one organization**. A unique constraint on `org_members.user_id` enforces this.
- An org has **many products**. Each product has its own versioned Sales Foundation, proof library, sales plans and checklists.
- Accounts, contacts and the suppression list belong to the org, so they're shared across products. Each deal, call and outreach sequence belongs to one product.
- Every table carries `org_id` and is protected by RLS (`org_id = current_org_id()`). The audit log can be inserted into and read, but never updated or deleted.
- Roles: `owner`, `manager`, `rep`. Owners and managers can edit settings and playbooks and invite teammates.

## What's built (MVP scope from section 10 of the plan)

| Module | Where |
|---|---|
| Guided company & offer intake, AI interview about gaps, versioned **Sales Foundation**. Every claim is source-labelled, and the foundation needs approval before use | `/products/[id]` |
| **Proof library**. Only approved proof can be cited in outreach | `/products/[id]/proof` |
| **Sales Plan Studio**: backwards funnel/capacity calculator plus an AI 30/60/90 plan | `/products/[id]/plan` |
| **Account workspace**: user-supplied public signals with sources, contacts with outreach basis and jurisdiction, AI research brief, CSV import | `/accounts` |
| **Outreach composer**: AI sequence, then a deterministic compliance gate, then an optional AI quality review, then **human approval**. Nothing is ever sent automatically | `/outreach` |
| **Checklist engine**: the six canonical playbooks from the plan. Clone and customize them; skipping a required item needs a reason (logged for coaching) | `/playbooks`, embedded everywhere |
| **Calls**: Prepare (AI brief), Live (stage-aware copilot, gap/cost-of-inaction panel, objection assistant, pause cue, two-option next step), Review (AI evidence extraction you confirm before it's applied, recap email, coaching) | `/calls/[id]` |
| **Deals**: Deal Evidence Record, readiness (*Ready / Proceed with caution / Missing critical evidence*), stage gates with override reasons, red flags, buying-belief map, AI diagnosis, proposal and mutual action plan draft | `/deals/[id]` |
| **Today**: ranked next best actions with rationale | `/today` |
| **Insights**: funnel diagnostics, objections traced to missing beliefs, evidence quality, outreach gate stats, overrides | `/insights` |
| **Settings**: team, invites, compliance policy, suppression list, audit log | `/settings` |

Deferred, as the plan specifies: HubSpot/Salesforce sync, Google and Microsoft calendar/email integrations, autonomous sending or calling, and call recording ingestion. Transcripts can be pasted in once consent is confirmed. CSV is the baseline import.

### AI design

- All OpenAI calls run **server-side only** (`src/lib/ai`) and go through one helper. That helper enforces the plan's guardrails: evidence before claims, source labels, no deceptive familiarity or pressure, and the seller stays in control.
- Output is requested as JSON and parsed with lenient schemas, so a slightly malformed response degrades instead of erroring.
- AI never writes to records silently. Call reviews are applied only after you confirm them, and merges only add data. Every AI action is written to the audit log.
- The model is configurable with `OPENAI_MODEL` (default `gpt-4.1-mini`).

## Local setup

1. **Create a Supabase project.** In the SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). With the Supabase CLI you can run `supabase db push` instead.
2. **Configure auth in Supabase:**
   - Authentication → URL Configuration: set **Site URL** to your app URL.
   - Add `http://localhost:3000/auth/callback` and `https://<your-amplify-domain>/auth/callback` to **Redirect URLs**.
   - Email confirmation can stay on. Users confirm and are then sent to onboarding.
3. **Environment:** `cp .env.example .env.local`, then fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` and `NEXT_PUBLIC_SITE_URL`.
4. Run `npm install` and then `npm run dev`. Open http://localhost:3000, sign up, create your org and add a product.

## Deploy to AWS Amplify Hosting

1. Push this folder to a Git repository (GitHub, GitLab, Bitbucket or CodeCommit).
2. In the Amplify console, choose **Create new app → Host web app** and connect the repo. Amplify detects Next.js SSR and uses the included [`amplify.yml`](amplify.yml).
3. Under **Hosting → Environment variables**, add:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your Amplify URL), `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`.
   - Amplify only exposes these at build time. The build spec writes them into `.env.production` so server actions can read them at runtime. Don't skip this step, or AI features fail with "OPENAI_API_KEY is not configured".
4. Deploy. Then add `https://<branch>.<app-id>.amplifyapp.com/auth/callback` (or your custom domain) to Supabase's Redirect URLs.

**Timeouts:** Amplify's SSR compute has a request timeout of about 30 seconds. The heavy AI flows are split so each request stays well under that:
- the foundation is generated in four sequential calls, one per section;
- outreach drafting and the AI quality review are separate requests.

If you switch to a slower reasoning model, watch the duration of the call review and the plan generation.

**Next.js version:** pinned to 15.5 because that is the line Amplify Hosting's SSR adapter is proven on. Check Amplify's support matrix before upgrading to 16.

## Project layout

```
supabase/migrations/0001_init.sql   schema, RLS, org RPCs (create_org, accept_invite, my_invites)
src/middleware.ts                    session refresh + auth redirect
src/lib/
  ai/client.ts, ai/tasks.ts          OpenAI guardrails + one function per AI role
  ai/schemas.ts                      lenient output schemas
  readiness.ts                       stage gates, red flags, presentation-unlock rule
  compliance.ts                      deterministic outreach gate
  evidence.ts                        Deal Evidence Record defaults + non-destructive merge
  playbook.ts                        8 conversation stages, objection map, funnel diagnostics
  checklists.ts                      the six canonical checklists
  funnel.ts                          revenue → deals → opps → meetings → accounts
src/app/actions/                     server actions (all mutations + AI calls)
src/app/(app)/                       authenticated pages
```

## Billing (Razorpay)

Plans, AI allowances and top-up packs are defined in `src/lib/billing/plans.ts` (prices in paise, excl. 18% GST).
Every AI request goes through `metered()` (`src/lib/billing/index.ts`): it reserves one AI action from the monthly
allowance, then from purchased top-up credits, and refunds it if the request fails.

Setup:

1. Run `supabase/migrations/0002_billing.sql`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` and the Razorpay keys to `.env.local` (see `.env.example`).
3. Create the monthly plans once: `RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... node scripts/razorpay-create-plans.mjs`
   and add the printed `RAZORPAY_PLAN_*` lines to the environment.
4. In the Razorpay Dashboard → Webhooks, add `https://YOUR-SITE/api/razorpay/webhook` with a secret
   (`RAZORPAY_WEBHOOK_SECRET`) and the events `subscription.activated`, `subscription.charged`,
   `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `order.paid`.
5. Subscriptions must be enabled on your Razorpay account (Dashboard → Subscriptions).

If you change a price in `plans.ts`, create a new Razorpay plan with the matching amount and update the env var.
