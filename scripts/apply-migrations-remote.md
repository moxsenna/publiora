# Apply migrations to cloud project `qluqhyfwpdknngxolsvi`

Dashboard SQL Editor (easiest without CLI login):

1. Open https://supabase.com/dashboard/project/qluqhyfwpdknngxolsvi/sql/new
2. Paste & run each file in order:
   - `supabase/migrations/20260718000001_profiles.sql`
   - `...02_billing.sql`
   - `...03_projects.sql`
   - `...04_generation.sql`
   - `...05_publish_claim.sql`
   - `...06_rls.sql`
   - `...07_spend_credits.sql`

Or CLI (after `npx supabase login`):

```bash
npx supabase link --project-ref qluqhyfwpdknngxolsvi
npx supabase db push
```

Then set in `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<service_role from Project Settings → API>
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
```
