-- 09 PayCore payment orders + idempotent event ledger

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  external_order_id text not null unique,
  paycore_order_id text unique,
  kind text not null
    check (kind in ('credit_pack', 'plan')),
  product_key text not null,
  pack_id text,
  plan_id text
    check (plan_id is null or plan_id in ('free', 'creator', 'pro')),
  amount integer not null check (amount > 0),
  currency text not null default 'IDR',
  credits integer,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'canceled')),
  checkout_url text,
  provider_reference text,
  fulfillment_data jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_orders_user_id
  on public.payment_orders (user_id);
create index if not exists idx_payment_orders_status
  on public.payment_orders (status);
create index if not exists idx_payment_orders_paycore
  on public.payment_orders (paycore_order_id);

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
  before update on public.payment_orders
  for each row
  execute function public.set_updated_at();

-- Processed PayCore webhook events (idempotent)
create table if not exists public.payment_events (
  event_id text primary key,
  order_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_payment_events_order_id
  on public.payment_events (order_id);

alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;

-- Users can read own orders
drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own"
on public.payment_orders
for select
to authenticated
using (user_id = auth.uid());

-- Writes via service role only (no user insert/update policies)
-- payment_events: no user access (service role only)
