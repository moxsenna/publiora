-- Manual verification (run against a test/staging DB after applying):
--   select count(*) from public.messages where metadata = '{}'::jsonb;
--   -- older rows should reflect the default value
--   insert into public.messages (project_id, role, content, agent, created_at, metadata)
--   values (...test data..., '{}'::jsonb);
--   select * from public.messages where metadata is not null limit 1;

alter table public.messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.messages.metadata is
  'Structured UI metadata for assistant messages, including contextual suggested replies.';
