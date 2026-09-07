-- 09 complete_signup_context_v1: finalize immutable signup attribution.
--
-- Called once after a session exists (signUp or signIn). Idempotent:
-- - final origins (anything ≠ 'unattributed') are never overwritten;
-- - a missing/expired/consumed context is ignored, not an error;
-- - an unattributed profile without context becomes direct_app/creator;
-- - the context row is marked consumed (one-time).
--
-- Only the SHA-256 token hash is ever passed in — the raw token never
-- reaches the DB.

create or replace function public.complete_signup_context_v1(
  p_token_hash text default null,
  p_marketing_email_consent boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_context public.signup_contexts;
  v_consent_source text := null;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if v_profile is null then
    raise exception 'profile_not_found';
  end if;

  -- Resolve and lock a valid context when supplied.
  if p_token_hash is not null then
    select *
    into v_context
    from public.signup_contexts
    where token_hash = p_token_hash
      and consumed_by_user_id is null
      and consumed_at is null
      and expires_at > now()
    for update;
  end if;

  -- Apply attribution only when the origin is still unattributed.
  -- This is the single place an origin moves off 'unattributed'.
  if coalesce(v_profile.signup_origin, 'unattributed') = 'unattributed' then
    -- NOTE: `is not null` on a row-type variable is false when ANY field is
    -- null. Check the PK instead.
    if v_context.id is not null then
      update public.profiles
      set signup_origin = v_context.source,
          initial_intent = v_context.initial_intent,
          first_claim_link_id = coalesce(
            v_context.claim_link_id,
            v_profile.first_claim_link_id
          ),
          first_claim_ebook_id = coalesce(
            v_context.ebook_id,
            v_profile.first_claim_ebook_id
          ),
          first_claim_creator_id = coalesce(
            v_context.source_creator_id,
            v_profile.first_claim_creator_id
          ),
          updated_at = now()
      where id = v_uid
      returning *
      into v_profile;
    else
      -- No context: direct app registration.
      update public.profiles
        set signup_origin = 'direct_app',
            initial_intent = 'creator',
            updated_at = now()
      where id = v_uid
      returning *
      into v_profile;
    end if;
  end if;

  -- Marketing consent, source derived from the context that carried the signup.
  if p_marketing_email_consent and not v_profile.marketing_email_consent then
    v_consent_source := case
      when v_context.id is not null and v_context.source = 'claim_link' then 'claim_signup'
      when v_context.id is not null then 'landing_signup'
      else 'account_settings'
    end;
    update public.profiles
      set marketing_email_consent = true,
          marketing_email_consent_at = now(),
          marketing_email_consent_source = v_consent_source,
          updated_at = now()
    where id = v_uid
    returning *
    into v_profile;
  end if;

  -- Consume the context (one-time use).
  if v_context.id is not null then
    update public.signup_contexts
      set consumed_by_user_id = v_uid,
          consumed_at = now()
      where id = v_context.id;
  end if;

  return v_profile;
end;
$$;

revoke all on function public.complete_signup_context_v1(
  text, boolean
) from public, anon;

grant execute on function public.complete_signup_context_v1(
  text, boolean
) to authenticated;