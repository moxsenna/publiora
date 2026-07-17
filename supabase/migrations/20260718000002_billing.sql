-- 02 billing: subscriptions, credit_balances, credit_transactions
-- free-plan bootstrap after profile insert

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan_id text not null default 'free'
    check (plan_id in ('free', 'creator', 'pro')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  renews_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_status on public.subscriptions (status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

create table if not exists public.credit_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null default 'free'
    check (plan_id in ('free', 'creator', 'pro')),
  balance integer not null default 0
    check (balance >= 0),
  period_grant integer not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '30 days'),
  lifetime_spent integer not null default 0
    check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists credit_balances_set_updated_at on public.credit_balances;
create trigger credit_balances_set_updated_at
  before update on public.credit_balances
  for each row
  execute function public.set_updated_at();

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('grant', 'purchase', 'spend', 'refund', 'adjust')),
  amount integer not null,
  balance_after integer not null,
  label text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_transactions_user_id
  on public.credit_transactions (user_id);
create index if not exists idx_credit_transactions_created_at
  on public.credit_transactions (created_at desc);
create index if not exists idx_credit_transactions_type
  on public.credit_transactions (type);

-- free plan bootstrap: 50 credits, 30-day period, grant txn
create or replace function public.handle_new_profile_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := now();
  v_period_end timestamptz := now() + interval '30 days';
  v_grant integer := 50;
begin
  insert into public.subscriptions (user_id, plan_id, status, renews_at)
  values (new.id, 'free', 'active', v_period_end)
  on conflict (user_id) do nothing;

  insert into public.credit_balances (
    user_id,
    plan_id,
    balance,
    period_grant,
    period_start,
    period_end,
    lifetime_spent
  )
  values (
    new.id,
    'free',
    v_grant,
    v_grant,
    v_period_start,
    v_period_end,
    0
  )
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    new.id,
    'grant',
    v_grant,
    v_grant,
    'Free plan signup grant',
    jsonb_build_object('plan_id', 'free', 'period_days', 30)
  );

  return new;
end;
$$;

drop trigger if exists on_profile_created_billing on public.profiles;
create trigger on_profile_created_billing
  after insert on public.profiles
  for each row
  execute function public.handle_new_profile_billing();
