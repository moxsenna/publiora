-- Atomic project + state + optional offer/link creation (V3).

create or replace function public.create_project_with_context_v3(
  p_project jsonb,
  p_state jsonb,
  p_readiness_score integer,
  p_existing_offer_id uuid default null,
  p_new_offer jsonb default null,
  p_relationship text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_project public.projects;
  v_score integer;
  v_offer public.offers;
  v_offer_id uuid;
  v_link public.project_offer_links;
  v_snapshot jsonb;
  v_relationship text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_owner := nullif(p_project->>'owner_id', '')::uuid;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'owner_mismatch' using errcode = '42501';
  end if;

  v_score := coalesce(p_readiness_score, 0);
  if v_score < 0 then
    v_score := 0;
  elsif v_score > 100 then
    v_score := 100;
  end if;

  v_relationship := nullif(p_relationship, '');

  -- Resolve or create offer
  if p_existing_offer_id is not null then
    select * into v_offer
    from public.offers o
    where o.id = p_existing_offer_id
      and o.owner_id = v_uid;

    if not found then
      raise exception 'offer_not_found' using errcode = 'P0002';
    end if;

    if v_offer.status = 'archived' then
      raise exception 'offer_archived' using errcode = '22023';
    end if;

    v_offer_id := v_offer.id;
  elsif p_new_offer is not null then
    insert into public.offers (
      owner_id,
      name,
      offer_type,
      ownership,
      status,
      short_description,
      target_audience,
      primary_problem,
      primary_outcome,
      niche,
      destination_url
    )
    values (
      v_uid,
      coalesce(p_new_offer->>'name', ''),
      coalesce(p_new_offer->>'offer_type', 'other'),
      coalesce(p_new_offer->>'ownership', 'owned'),
      'active',
      nullif(p_new_offer->>'short_description', ''),
      nullif(p_new_offer->>'target_audience', ''),
      nullif(p_new_offer->>'primary_problem', ''),
      nullif(p_new_offer->>'primary_outcome', ''),
      nullif(p_new_offer->>'niche', ''),
      nullif(p_new_offer->>'destination_url', '')
    )
    returning * into v_offer;

    v_offer_id := v_offer.id;
  else
    v_offer_id := null;
  end if;

  if v_offer_id is not null and v_relationship is null then
    raise exception 'relationship_required' using errcode = '22023';
  end if;

  if v_offer_id is null and v_relationship is not null then
    raise exception 'offer_required_for_relationship' using errcode = '22023';
  end if;

  insert into public.projects (
    owner_id,
    title,
    author,
    subtitle,
    description,
    audience,
    tone,
    niche,
    ebook_type,
    status,
    template_id,
    progress,
    sections_generated,
    total_sections,
    cover_color,
    cta_goal,
    final_cta,
    cta_url
  )
  values (
    v_uid,
    coalesce(p_project->>'title', ''),
    coalesce(p_project->>'author', ''),
    nullif(p_project->>'subtitle', ''),
    coalesce(p_project->>'description', ''),
    coalesce(p_project->>'audience', ''),
    coalesce(p_project->>'tone', ''),
    coalesce(p_project->>'niche', ''),
    coalesce(nullif(p_project->>'ebook_type', ''), 'lead_magnet'),
    coalesce(nullif(p_project->>'status', ''), 'draft'),
    nullif(p_project->>'template_id', ''),
    coalesce((p_project->>'progress')::integer, 0),
    coalesce((p_project->>'sections_generated')::integer, 0),
    coalesce((p_project->>'total_sections')::integer, 0),
    coalesce(nullif(p_project->>'cover_color', ''), '#6366f1'),
    nullif(p_project->>'cta_goal', ''),
    nullif(p_project->>'final_cta', ''),
    nullif(p_project->>'cta_url', '')
  )
  returning * into v_project;

  insert into public.project_states (
    project_id,
    state_json,
    readiness_score
  )
  values (
    v_project.id,
    coalesce(p_state, '{}'::jsonb),
    v_score
  );

  if v_offer_id is not null then
    -- Rebuild snapshot server-side from offer row
    select * into v_offer from public.offers where id = v_offer_id;

    v_snapshot := jsonb_build_object(
      'version', 1,
      'offer_id', v_offer.id,
      'name', v_offer.name,
      'offer_type', v_offer.offer_type,
      'ownership', v_offer.ownership,
      'short_description', v_offer.short_description,
      'target_audience', v_offer.target_audience,
      'primary_problem', v_offer.primary_problem,
      'primary_outcome', v_offer.primary_outcome,
      'niche', v_offer.niche,
      'destination_url', v_offer.destination_url
    );

    insert into public.project_offer_links (
      project_id,
      offer_id,
      relationship,
      is_primary,
      context_snapshot,
      source_offer_updated_at,
      synced_at
    )
    values (
      v_project.id,
      v_offer_id,
      v_relationship,
      true,
      v_snapshot,
      v_offer.updated_at,
      now()
    )
    returning * into v_link;
  end if;

  return jsonb_build_object(
    'project', to_jsonb(v_project),
    'offer_id', v_offer_id,
    'link_id', v_link.id
  );
end;
$$;

revoke all on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) from public;
grant execute on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) to authenticated;
grant execute on function public.create_project_with_context_v3(jsonb, jsonb, integer, uuid, jsonb, text) to service_role;
