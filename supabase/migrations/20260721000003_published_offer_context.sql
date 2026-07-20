-- Store immutable offer context on published ebooks (reader uses snapshot only).

alter table public.published_ebooks
  add column if not exists offer_context jsonb;

comment on column public.published_ebooks.offer_context is
  'Immutable linked offer snapshot at publish time. Reader must not query live offers.';
