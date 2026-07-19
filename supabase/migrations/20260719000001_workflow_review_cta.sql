-- 10 workflow_review_cta: CTA goal/text/url columns for review + publish persistence
-- aligned with types/project.ts, types/published-ebook.ts, types/ai-suggestions

alter table public.projects
  add column if not exists cta_goal text,
  add column if not exists final_cta text,
  add column if not exists cta_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_cta_goal_check'
  ) then
    alter table public.projects
      add constraint projects_cta_goal_check
      check (
        cta_goal is null or cta_goal in (
          'visit_product',
          'join_whatsapp',
          'claim_bonus',
          'buy_product',
          'follow_creator',
          'custom'
        )
      );
  end if;
end $$;

alter table public.published_ebooks
  add column if not exists cta_goal text,
  add column if not exists final_cta text,
  add column if not exists cta_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'published_ebooks_cta_goal_check'
  ) then
    alter table public.published_ebooks
      add constraint published_ebooks_cta_goal_check
      check (
        cta_goal is null or cta_goal in (
          'visit_product',
          'join_whatsapp',
          'claim_bonus',
          'buy_product',
          'follow_creator',
          'custom'
        )
      );
  end if;
end $$;
