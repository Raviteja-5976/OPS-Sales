-- OpenRiverStack schema
-- Tenancy model: a user belongs to exactly one org (org_members.user_id is unique);
-- an org owns many products; every business record carries org_id and is protected by RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Orgs and membership
-- ---------------------------------------------------------------------------

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  -- compliance + motion settings: send window, touch limits, inbound SLA, etc.
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'rep' check (role in ('owner', 'manager', 'rep')),
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint org_members_one_org_per_user unique (user_id)
);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null,
  role text not null default 'rep' check (role in ('manager', 'rep')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- Helpers used by RLS. SECURITY DEFINER avoids recursive policy evaluation on org_members.
create or replace function public.current_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.org_members where user_id = auth.uid() limit 1
$$;

create or replace function public.current_org_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.org_members where user_id = auth.uid() limit 1
$$;

-- Create an org and make the caller its owner (atomic; enforces one org per user).
create or replace function public.create_org(p_name text, p_website text default null, p_full_name text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.org_members where user_id = auth.uid()) then
    raise exception 'You already belong to an organization';
  end if;
  insert into public.orgs (name, website, created_by, settings)
  values (
    p_name, p_website, auth.uid(),
    jsonb_build_object(
      'inbound_sla_minutes', 5,
      'max_touches_per_week', 3,
      'send_window_start', '08:00',
      'send_window_end', '18:00',
      'require_unsubscribe', true,
      'prohibited_phrases', jsonb_build_array('guaranteed results', 'act now', 'last chance', 'risk-free', '100% guaranteed')
    )
  )
  returning id into v_org;
  insert into public.org_members (org_id, user_id, role, email, full_name)
  values (v_org, auth.uid(), 'owner', auth.jwt() ->> 'email', p_full_name);
  return v_org;
end;
$$;

-- Invites addressed to the caller's email (caller is not yet a member, so this must bypass RLS).
create or replace function public.my_invites()
returns table (id uuid, org_id uuid, org_name text, role text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select i.id, i.org_id, o.name, i.role, i.created_at
  from public.org_invites i
  join public.orgs o on o.id = i.org_id
  where lower(i.email) = lower(auth.jwt() ->> 'email')
    and i.accepted_at is null
$$;

create or replace function public.accept_invite(p_invite uuid, p_full_name text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_inv public.org_invites;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.org_members where user_id = auth.uid()) then
    raise exception 'You already belong to an organization';
  end if;
  select * into v_inv from public.org_invites
  where id = p_invite and accepted_at is null and lower(email) = lower(auth.jwt() ->> 'email');
  if not found then
    raise exception 'Invite not found';
  end if;
  insert into public.org_members (org_id, user_id, role, email, full_name)
  values (v_inv.org_id, auth.uid(), v_inv.role, auth.jwt() ->> 'email', p_full_name);
  update public.org_invites set accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end;
$$;

grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_org_role() to authenticated;
grant execute on function public.create_org(text, text, text) to authenticated;
grant execute on function public.my_invites() to authenticated;
grant execute on function public.accept_invite(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Products and the Sales Foundation
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  one_liner text,
  category text,
  website text,
  -- full guided intake answers + AI interview Q&A
  intake jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products (org_id);

create table public.foundations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  content jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, version)
);
create index on public.foundations (org_id);
create index on public.foundations (product_id);

create table public.proof_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  kind text not null default 'case_study'
    check (kind in ('case_study', 'testimonial', 'metric', 'security', 'integration', 'reference', 'other')),
  title text not null,
  body text,
  source_label text not null default 'company-provided'
    check (source_label in ('company-provided', 'public-research', 'ai-hypothesis', 'buyer-confirmed')),
  source_url text,
  approved_for_outreach boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.proof_items (org_id);
create index on public.proof_items (product_id);

create table public.sales_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  inputs jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sales_plans (org_id);
create index on public.sales_plans (product_id);

-- ---------------------------------------------------------------------------
-- Accounts, contacts, suppression
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  employee_count text,
  geography text,
  tier int not null default 2 check (tier between 1 and 3),
  status text not null default 'target'
    check (status in ('target', 'engaged', 'customer', 'nurture', 'disqualified')),
  fit_reason text,
  why_now text,
  disqualify_reason text,
  notes text,
  -- user-supplied public signals: [{text, url, date}]
  signals jsonb not null default '[]'::jsonb,
  research_brief jsonb,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.accounts (org_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  linkedin_url text,
  buying_role text not null default 'unknown'
    check (buying_role in ('economic_buyer', 'champion', 'end_user', 'technical_evaluator', 'procurement', 'influencer', 'unknown')),
  jurisdiction text,
  contact_source text,
  outreach_basis text not null default 'unverified'
    check (outreach_basis in ('consent', 'legitimate_interest', 'existing_relationship', 'unverified')),
  opted_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.contacts (org_id);
create index on public.contacts (account_id);

create table public.suppressions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  value text not null, -- email address or domain
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, value)
);

-- ---------------------------------------------------------------------------
-- Outreach (human-approved sequences)
-- ---------------------------------------------------------------------------

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  objective text not null default 'meeting'
    check (objective in ('permission', 'relevance', 'meeting', 're-engagement')),
  angle text,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected', 'active', 'stopped', 'completed')),
  content jsonb not null default '{}'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sequences (org_id);
create index on public.sequences (account_id);

-- ---------------------------------------------------------------------------
-- Deals (opportunities) with the Deal Evidence Record
-- ---------------------------------------------------------------------------

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  stage text not null default 'discovery'
    check (stage in ('prospecting', 'discovery', 'qualified', 'proposal', 'commit', 'won', 'lost', 'nurture')),
  amount numeric,
  currency text not null default 'USD',
  close_date date,
  evidence jsonb not null default '{}'::jsonb,
  proposal jsonb,
  ai_diagnosis jsonb,
  outcome_reason text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.deals (org_id);
create index on public.deals (account_id);
create index on public.deals (product_id);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  kind text not null default 'discovery' check (kind in ('cold_call', 'discovery', 'follow_up', 'proposal', 'other')),
  scheduled_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'live', 'completed', 'cancelled')),
  objective text,
  prep_brief jsonb,
  -- live capture: [{at, stage, kind, text}]
  live_notes jsonb not null default '[]'::jsonb,
  current_stage int not null default 1,
  notes text,
  transcript text,
  review jsonb,
  consent_to_record boolean not null default false,
  owner_id uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.calls (org_id);
create index on public.calls (deal_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  title text not null,
  owner_label text, -- "us" / buyer name: commitments can be owned by either side
  due_date date,
  done boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'call', 'ai', 'checklist')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.tasks (org_id);

-- ---------------------------------------------------------------------------
-- Checklist engine
-- ---------------------------------------------------------------------------

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  key text not null, -- built-in key it was cloned from, or 'custom'
  name text not null,
  description text,
  scope text not null check (scope in ('product', 'plan', 'account', 'call', 'deal')),
  -- [{id, section, text, why, required, ai_action, mode}]
  items jsonb not null default '[]'::jsonb,
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.checklist_templates (org_id);

create table public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  entity_type text not null check (entity_type in ('product', 'plan', 'account', 'call', 'deal')),
  entity_id uuid not null,
  -- { [itemId]: {done, note, overridden, override_reason, at, by} }
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, entity_type, entity_id)
);
create index on public.checklist_runs (org_id);
create index on public.checklist_runs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Immutable audit log (sends, approvals, overrides, AI actions)
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null, -- e.g. ai.generate, sequence.approve, deal.stage_override
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_events (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['products','foundations','sales_plans','accounts','sequences','deals','calls','checklist_templates','checklist_runs']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;

create policy orgs_select on public.orgs for select using (id = public.current_org_id());
create policy orgs_update on public.orgs for update
  using (id = public.current_org_id() and public.current_org_role() in ('owner', 'manager'))
  with check (id = public.current_org_id());

create policy members_select on public.org_members for select using (org_id = public.current_org_id());
create policy members_update on public.org_members for update
  using (org_id = public.current_org_id() and public.current_org_role() = 'owner')
  with check (org_id = public.current_org_id());
create policy members_delete on public.org_members for delete
  using (org_id = public.current_org_id() and public.current_org_role() = 'owner' and user_id <> auth.uid());

create policy invites_all on public.org_invites for all
  using (org_id = public.current_org_id() and public.current_org_role() in ('owner', 'manager'))
  with check (org_id = public.current_org_id() and public.current_org_role() in ('owner', 'manager'));

-- Standard tenant policy for every business table.
do $$
declare t text;
begin
  foreach t in array array['products','foundations','proof_items','sales_plans','accounts','contacts','suppressions','sequences','deals','calls','tasks','checklist_templates','checklist_runs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id())',
      t || '_tenant', t
    );
  end loop;
end $$;

-- Audit log: members may read and append, never update or delete.
alter table public.audit_events enable row level security;
create policy audit_select on public.audit_events for select using (org_id = public.current_org_id());
create policy audit_insert on public.audit_events for insert
  with check (org_id = public.current_org_id() and actor_id = auth.uid());
