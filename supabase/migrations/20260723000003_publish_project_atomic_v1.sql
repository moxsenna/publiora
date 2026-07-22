-- Atomic publish/republish: stable published_ebooks row per project.

create unique index if not exists idx_published_ebooks_project_id_unique
  on public.published_ebooks (project_id);

create or replace function public.publish_project_atomic_v1(
  p_project_id uuid,
  p_publication_snapshot jsonb,
  p_is_public boolean,
  p_slug text
)
returns public.published_ebooks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project public.projects%rowtype;
  v_pub public.published_ebooks%rowtype;
  v_now timestamptz := now();
  v_slug text := nullif(trim(p_slug), '');
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  if p_publication_snapshot is null or jsonb_typeof(p_publication_snapshot) <> 'object' then
    raise exception 'invalid_snapshot';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project_not_found';
  end if;

  if v_project.owner_id is distinct from v_uid then
    raise exception 'forbidden';
  end if;

  select * into v_pub
  from public.published_ebooks
  where project_id = p_project_id
  for update;

  if found then
    update public.published_ebooks
    set
      title = coalesce(p_publication_snapshot->>'title', title),
      subtitle = p_publication_snapshot->>'subtitle',
      author = coalesce(p_publication_snapshot->>'author', author),
      cover_color = coalesce(p_publication_snapshot->>'cover_color', cover_color),
      sections = coalesce(p_publication_snapshot->'sections', sections),
      is_public = coalesce(p_is_public, is_public),
      slug = case
        when v_slug is not null and v_slug <> '' then v_slug
        else slug
      end,
      cta_goal = p_publication_snapshot->>'cta_goal',
      final_cta = p_publication_snapshot->>'final_cta',
      cta_url = p_publication_snapshot->>'cta_url',
      offer_context = p_publication_snapshot->'offer_context',
      published_at = v_now,
      updated_at = v_now
    where id = v_pub.id
    returning * into v_pub;
  else
    if v_slug is null then
      v_slug := lower(regexp_replace(coalesce(p_publication_snapshot->>'title', 'ebook'), '[^a-z0-9]+', '-', 'g'))
        || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    end if;

    insert into public.published_ebooks (
      project_id,
      creator_id,
      title,
      slug,
      subtitle,
      author,
      cover_color,
      sections,
      is_public,
      total_readers,
      active_claims,
      published_at,
      cta_goal,
      final_cta,
      cta_url,
      offer_context
    ) values (
      p_project_id,
      v_uid,
      coalesce(p_publication_snapshot->>'title', v_project.title),
      v_slug,
      p_publication_snapshot->>'subtitle',
      coalesce(p_publication_snapshot->>'author', v_project.author),
      coalesce(p_publication_snapshot->>'cover_color', v_project.cover_color),
      coalesce(p_publication_snapshot->'sections', '[]'::jsonb),
      coalesce(p_is_public, true),
      0,
      0,
      v_now,
      p_publication_snapshot->>'cta_goal',
      p_publication_snapshot->>'final_cta',
      p_publication_snapshot->>'cta_url',
      p_publication_snapshot->'offer_context'
    )
    returning * into v_pub;
  end if;

  update public.projects
  set
    status = 'published',
    published_at = v_now,
    updated_at = v_now
  where id = p_project_id;

  return v_pub;
end;
$$;

revoke all on function public.publish_project_atomic_v1(uuid, jsonb, boolean, text) from public;
grant execute on function public.publish_project_atomic_v1(uuid, jsonb, boolean, text) to authenticated;
