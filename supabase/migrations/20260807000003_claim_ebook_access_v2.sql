-- 09 claim_ebook_access_v2: resolve a claim atomically in one transaction.
--
-- Replaces the multi-step client sequence (read link → read ebook → check
-- entitlement → insert → increment counters) which could double-claim under
-- concurrency. This RPC locks the claim link row first, so concurrent
-- duplicate claims serialize: the second caller sees the first commit and
-- resolves to already_owned without consuming an extra slot.
--
-- Rules (mirror §15 and Task 14 of the implementation plan):
-- - requires a JWT (auth.uid());
-- - status/expiry/usage validated before anything is written;
-- - expected states are *returned* as jsonb, not raised — the route maps
--   them 1:1 to its existing { status } responses;
-- - already-owned: claim_event only, no counter increment;
-- - new: entitlement insert + used_count + total_readers + claim_event;
-- - reader activation is one-shot and applied by the
--   entitlements_activate_reader_lifecycle trigger (coalesce on existing);
-- - a failed insert rolls back the whole transaction (no counters).

create or replace function public.claim_ebook_access_v2(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_link public.claim_links;
  v_ebook public.published_ebooks;
  v_ent public.entitlements;
  v_status text;
  v_reader_email text;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select email into v_reader_email
  from public.profiles
  where id = v_uid;

  select * into v_link
  from public.claim_links
  where token = upper(p_token)
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_link.status = 'revoked' then
    v_status := 'revoked';
    insert into public.claim_events (claim_link_id, reader_email, status)
    values (v_link.id, coalesce(v_reader_email, v_uid::text), 'revoked');
    return jsonb_build_object('status', v_status);
  end if;

  if v_link.status = 'expired'
     or (v_link.expires_at is not null and v_link.expires_at < now()) then
    update public.claim_links set status = 'expired' where id = v_link.id;
    v_status := 'expired';
    insert into public.claim_events (claim_link_id, reader_email, status)
    values (v_link.id, coalesce(v_reader_email, v_uid::text), 'expired');
    return jsonb_build_object('status', v_status);
  end if;

  if v_link.max_uses is not null and v_link.used_count >= v_link.max_uses then
    v_status := 'limit_reached';
    insert into public.claim_events (claim_link_id, reader_email, status)
    values (v_link.id, coalesce(v_reader_email, v_uid::text), 'limit_reached');
    return jsonb_build_object('status', v_status);
  end if;

  select * into v_ebook
  from public.published_ebooks
  where id = v_link.ebook_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Already owned: event only, no slot consumed, no counter increment.
  select * into v_ent
  from public.entitlements
  where reader_id = v_uid
    and ebook_id = v_ebook.id;

  if v_ent.id is not null then
    v_status := 'already_owned';
    insert into public.claim_events (claim_link_id, reader_email, status)
    values (v_link.id, coalesce(v_reader_email, v_uid::text), 'already_owned');
    return claim_result(v_status, v_ebook, v_ent);
  end if;

  -- Atomically insert the entitlement; the unique(reader_id,ebook_id) row
  -- guard makes a concurrent duplicate resolve to already_owned (no
  -- double-delivery, no double counter).
  insert into public.entitlements (
    reader_id, ebook_id, claim_link_id, ebook_title, ebook_slug,
    cover_color, author
  )
  values (
    v_uid, v_ebook.id, v_link.id, v_ebook.title, v_ebook.slug,
    v_ebook.cover_color, v_ebook.author
  )
  on conflict (reader_id, ebook_id) do nothing
  returning * into v_ent;

  if v_ent.id is null then
    -- Lost a race: another request already granted access.
    select * into v_ent
    from public.entitlements
    where reader_id = v_uid
      and ebook_id = v_ebook.id;
    v_status := 'already_owned';
    insert into public.claim_events (claim_link_id, reader_email, status)
    values (v_link.id, coalesce(v_reader_email, v_uid::text), 'already_owned');
    return claim_result_json(v_status, v_ebook, v_ent);
  end if;

  -- Fresh claim: consume one slot and count the reader. The trigger
  -- entitlements_activate_reader_lifecycle sets reader_activated_at once.
  v_status := 'claimed';
  update public.claim_links
  set used_count = used_count + 1
  where id = v_link.id;

  update public.published_ebooks
  set total_readers = total_readers + 1
  where id = v_ebook.id;

  insert into public.claim_events (claim_link_id, reader_email, status)
  values (v_link.id, coalesce(v_reader_email, v_uid::text), 'claimed');

  return claim_result_json(v_status, v_ebook, v_ent);
end;
$$;

-- Helper to assemble the route-shaped response (same fields the old route
-- mapped manually). Kept as its own function so the RPC body stays readable.
create or replace function public.claim_result_json(
  p_status text,
  p_ebook public.published_ebooks,
  p_ent public.entitlements
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'status', p_status,
    'ebook', jsonb_build_object(
      'id', p_ebook.id,
      'project_id', p_ebook.project_id,
      'slug', p_ebook.slug,
      'title', p_ebook.title,
      'author', p_ebook.author,
      'subtitle', p_ebook.subtitle,
      'cover_color', p_ebook.cover_color,
      'sections', coalesce(p_ebook.sections, '[]'::jsonb),
      'published_at', p_ebook.published_at,
      'total_readers', p_ebook.total_readers,
      'active_claims', p_ebook.active_claims,
      'is_public', p_ebook.is_public,
      'cta_goal', p_ebook.cta_goal,
      'final_cta', p_ebook.final_cta,
      'cta_url', p_ebook.cta_url
    ),
    'entitlement', jsonb_build_object(
      'id', p_ent.id,
      'reader_id', p_ent.reader_id,
      'ebook_id', p_ent.ebook_id,
      'claim_link_id', p_ent.claim_link_id,
      'ebook_title', p_ent.ebook_title,
      'ebook_slug', p_ent.ebook_slug,
      'cover_color', p_ent.cover_color,
      'author', p_ent.author,
      'created_at', p_ent.created_at
    )
  );
end;
$$;

revoke all on function public.claim_ebook_access_v2(text) from public, anon;
grant execute on function public.claim_ebook_access_v2(text) to authenticated;

revoke all on function public.claim_result_json
  (text, public.published_ebooks, public.entitlements) from public, anon;
grant execute on function public.claim_result_json
  (text, public.published_ebooks, public.entitlements) to authenticated;