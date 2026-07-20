-- Atomic project + strategy state creation.
-- Call from authenticated server route only; owner must match auth.uid().

create or replace function public.create_project_with_state(
  p_project jsonb,
  p_state jsonb,
  p_readiness_score integer
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_project public.projects;
  v_score integer;
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

  return v_project;
end;
$$;

revoke all on function public.create_project_with_state(jsonb, jsonb, integer) from public;
grant execute on function public.create_project_with_state(jsonb, jsonb, integer) to authenticated;
grant execute on function public.create_project_with_state(jsonb, jsonb, integer) to service_role;
