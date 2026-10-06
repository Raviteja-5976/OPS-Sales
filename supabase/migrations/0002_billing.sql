-- Billing: Razorpay subscriptions, AI action metering and top-up credit packs.
--
-- Plan definitions (prices, AI allowances, product/seat limits) live in src/lib/billing/plans.ts.
-- The database stores which plan an org is on and meters usage atomically. Every write to these
-- tables goes through the server (service role) after it has verified the caller; members can
-- only read their own org's billing state.

-- ---------------------------------------------------------------------------
-- Current billing state per org (one row per org)
-- ---------------------------------------------------------------------------

create table public.org_billing (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  plan text not null default 'free',
  -- active | past_due (payment failed, Razorpay retrying) | cancelled
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  seats int not null default 1 check (seats >= 1),
  period_start timestamptz,
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  razorpay_subscription_id text,
  -- Purchased top-up AI actions. Used only after the plan's monthly allowance is spent; never expire.
  credit_balance int not null default 0 check (credit_balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger org_billing_touch before update on public.org_billing for each row execute function public.touch_updated_at();

-- Every org gets a free billing row.
insert into public.org_billing (org_id) select id from public.orgs on conflict do nothing;

create or replace function public.orgs_create_billing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_billing (org_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger orgs_create_billing after insert on public.orgs for each row execute function public.orgs_create_billing();

-- ---------------------------------------------------------------------------
-- Razorpay subscriptions (every one we create, so webhooks can be mapped to an org)
-- ---------------------------------------------------------------------------

create table public.billing_subscriptions (
  razorpay_subscription_id text primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  plan text not null,
  seats int not null default 1,
  -- mirrors Razorpay: created | authenticated | active | pending | halted | cancelled | completed | expired
  status text not null default 'created',
  current_start timestamptz,
  current_end timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.billing_subscriptions (org_id, created_at desc);
create trigger billing_subscriptions_touch before update on public.billing_subscriptions for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- One-time top-up purchases (Razorpay orders)
-- ---------------------------------------------------------------------------

create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  pack text not null,
  credits int not null check (credits > 0),
  amount_paise int not null, -- incl. GST, as charged
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on public.credit_purchases (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI usage ledger: one row per AI request
-- ---------------------------------------------------------------------------

create table public.ai_usage (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  -- 'plan' = counted against the monthly allowance, 'credit' = paid from the top-up balance
  source text not null check (source in ('plan', 'credit')),
  status text not null default 'reserved' check (status in ('reserved', 'done', 'refunded')),
  model text,
  tokens int,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (org_id, created_at desc);

-- Webhook idempotency: Razorpay may deliver the same event more than once.
create table public.billing_events (
  event_id text primary key,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Metering functions (service role only; the server decides the allowance)
-- ---------------------------------------------------------------------------

-- Reserve one AI action. Uses the monthly allowance first, then top-up credits.
-- Returns the usage id and its source, or no row when the org is out of actions.
-- The billing row lock serialises concurrent requests from the same org.
create or replace function public.consume_ai_action(
  p_org uuid,
  p_user uuid,
  p_feature text,
  p_allowance int,
  p_period_start timestamptz
)
returns table (usage_id bigint, source text)
language plpgsql security definer set search_path = public
as $$
declare
  v_balance int;
  v_used int;
  v_id bigint;
begin
  insert into public.org_billing (org_id) values (p_org) on conflict do nothing;
  select credit_balance into v_balance from public.org_billing where org_id = p_org for update;

  select count(*) into v_used from public.ai_usage u
  where u.org_id = p_org and u.source = 'plan' and u.status <> 'refunded' and u.created_at >= p_period_start;

  if v_used < p_allowance then
    insert into public.ai_usage (org_id, user_id, feature, source) values (p_org, p_user, p_feature, 'plan') returning id into v_id;
    return query select v_id, 'plan'::text;
  elsif v_balance > 0 then
    update public.org_billing set credit_balance = credit_balance - 1 where org_id = p_org;
    insert into public.ai_usage (org_id, user_id, feature, source) values (p_org, p_user, p_feature, 'credit') returning id into v_id;
    return query select v_id, 'credit'::text;
  end if;
end;
$$;

-- Give an action back when the AI request failed.
create or replace function public.refund_ai_action(p_usage bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.ai_usage;
begin
  update public.ai_usage set status = 'refunded' where id = p_usage and status = 'reserved' returning * into v_row;
  if found and v_row.source = 'credit' then
    update public.org_billing set credit_balance = credit_balance + 1 where org_id = v_row.org_id;
  end if;
end;
$$;

-- Mark a top-up order paid and add its credits exactly once. Returns false if it was already paid.
create or replace function public.grant_credit_purchase(p_order text, p_payment text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.credit_purchases;
begin
  update public.credit_purchases
  set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
  where razorpay_order_id = p_order and status = 'created'
  returning * into v_row;
  if not found then
    return false;
  end if;
  insert into public.org_billing (org_id) values (v_row.org_id) on conflict do nothing;
  update public.org_billing set credit_balance = credit_balance + v_row.credits where org_id = v_row.org_id;
  return true;
end;
$$;

revoke execute on function public.consume_ai_action(uuid, uuid, text, int, timestamptz) from public, anon, authenticated;
revoke execute on function public.refund_ai_action(bigint) from public, anon, authenticated;
revoke execute on function public.grant_credit_purchase(text, text) from public, anon, authenticated;
grant execute on function public.consume_ai_action(uuid, uuid, text, int, timestamptz) to service_role;
grant execute on function public.refund_ai_action(bigint) to service_role;
grant execute on function public.grant_credit_purchase(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security: members read their org's billing; nobody writes from the client
-- ---------------------------------------------------------------------------

alter table public.org_billing enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.ai_usage enable row level security;
alter table public.billing_events enable row level security;

create policy org_billing_select on public.org_billing for select using (org_id = public.current_org_id());
create policy billing_subscriptions_select on public.billing_subscriptions for select using (org_id = public.current_org_id());
create policy credit_purchases_select on public.credit_purchases for select using (org_id = public.current_org_id());
create policy ai_usage_select on public.ai_usage for select using (org_id = public.current_org_id());
-- billing_events: no policies, service role only.
