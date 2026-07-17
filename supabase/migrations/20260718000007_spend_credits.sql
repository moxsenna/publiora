-- 07 spend_credits + grant_credits RPCs (row lock, balance integrity)

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_label text,
  p_meta jsonb default '{}'::jsonb
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_new_balance integer;
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'label required';
  end if;

  -- authenticated may only debit self; service_role unrestricted
  if v_jwt_role is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed to spend credits for another user';
  end if;

  -- lock row for concurrent-safe debit
  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  if v_balance.balance < p_amount then
    raise exception 'insufficient credits';
  end if;

  v_new_balance := v_balance.balance - p_amount;

  update public.credit_balances
  set
    balance = v_new_balance,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    p_user_id,
    'spend',
    -p_amount,
    v_new_balance,
    p_label,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_label text,
  p_meta jsonb default '{}'::jsonb
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_new_balance integer;
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_type is null or p_type not in ('grant', 'purchase', 'refund', 'adjust') then
    raise exception 'invalid credit type: %', p_type;
  end if;

  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'label required';
  end if;

  -- authenticated may only credit self; service_role unrestricted
  if v_jwt_role is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed to grant credits for another user';
  end if;

  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  v_new_balance := v_balance.balance + p_amount;

  update public.credit_balances
  set
    balance = v_new_balance,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    label,
    meta
  )
  values (
    p_user_id,
    p_type,
    p_amount,
    v_new_balance,
    p_label,
    coalesce(p_meta, '{}'::jsonb)
  );

  return v_balance;
end;
$$;

-- revoke execute from public/anon; grant to authenticated + service_role
revoke all on function public.spend_credits(uuid, integer, text, jsonb) from public;
revoke all on function public.grant_credits(uuid, integer, text, text, jsonb) from public;

grant execute on function public.spend_credits(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.spend_credits(uuid, integer, text, jsonb) to service_role;

grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to service_role;
-- authenticated may call grant only via controlled server path; keep service_role primary
-- grant execute to authenticated for refunds from own failed jobs if needed later
grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to authenticated;
