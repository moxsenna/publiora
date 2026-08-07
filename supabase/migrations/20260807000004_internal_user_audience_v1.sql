-- 10 internal_user_audience_v1: one row per user, service-role only.
--
-- Internal audience segmentation for ops/support planning (§19 of the
-- implementation plan). Returns derived audience metadata only — no
-- content, briefs, AI conversations, payment credentials, or reading text.
--
-- Security:
-- - select revoked from anon/authenticated/public;
-- - readable by service_role only, so normal client code (and RLS-gated
--   authenticated queries) can never see it;
-- - derived_segment is a pure function of attribution + lifecycle state and
--   yields exactly one canonical segment per user (§19.2 priority order):
--     claim + paid creator → claim_reader_became_paid_creator
--     claim + creator      → claim_reader_became_creator
--     claim + reader only  → claim_reader_only
--     landing + creator    → landing_creator_active
--     landing + prospect   → landing_creator_prospect
--     direct               → direct_creator
--     legacy / other       → legacy_unclassified

create or replace view public.internal_user_audience_v1
as
select
  p.id                                                       as user_id,
  p.email,
  p.name,
  p.signup_origin,
  p.initial_intent,
  p.first_claim_link_id,
  p.first_claim_ebook_id,
  p.first_claim_creator_id,
  cl.label                                                   as first_claim_label,
  eb.title                                                   as first_claim_ebook_title,
  p.reader_activated_at,
  p.creator_activated_at,
  p.creator_subscribed_at,
  (select count(*) from public.entitlements e where e.reader_id = p.id)      as entitlement_count,
  (select count(*) from public.projects pr where pr.owner_id = p.id)        as project_count,
  (select count(*) from public.published_ebooks px where px.creator_id = p.id) as publication_count,
  coalesce(s.plan_id, p.plan_id)                             as current_plan_id,
  coalesce(s.status, 'active')                               as current_subscription_status,
  p.marketing_email_consent,
  p.marketing_email_consent_at,
  p.created_at,
  greatest(
    p.updated_at,
    p.reader_activated_at,
    p.creator_activated_at,
    p.creator_subscribed_at
  )                                                          as last_known_activity_at,
  case
    when p.signup_origin = 'claim_link' and p.creator_subscribed_at is not null
      then 'claim_reader_became_paid_creator'
    when p.signup_origin = 'claim_link' and p.creator_activated_at is not null
      then 'claim_reader_became_creator'
    -- A claim-origin signup that has not activated yet still belongs to the
    -- claim audience (they arrived to read); the canonical list has no
    -- "claim signup, nothing more" persona (§19.2: do not add personas).
    when p.signup_origin = 'claim_link'
      then 'claim_reader_only'
    when p.signup_origin = 'landing_page' and p.creator_activated_at is not null
      then 'landing_creator_active'
    when p.signup_origin = 'landing_page'
      then 'landing_creator_prospect'
    when p.signup_origin = 'direct_app'
      then 'direct_creator'
    -- unattributed (pre-completion), legacy_unknown, admin_created, null
    else 'legacy_unclassified'
  end                                                       as derived_segment
from public.profiles p
left join public.claim_links cl      on cl.id = p.first_claim_link_id
left join public.published_ebooks eb on eb.id = p.first_claim_ebook_id
left join public.subscriptions s     on s.user_id = p.id;

revoke all on table public.internal_user_audience_v1 from anon, authenticated, public;
grant select on public.internal_user_audience_v1 to service_role;