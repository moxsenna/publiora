-- 08 add ebook_type to projects (lead_magnet | bonus_product | sellable_ebook)

alter table public.projects
  add column if not exists ebook_type text not null default 'lead_magnet'
    check (ebook_type in ('lead_magnet', 'bonus_product', 'sellable_ebook'));

create index if not exists idx_projects_ebook_type on public.projects (ebook_type);
