# Apply migrations to cloud project `qluqhyfwpdknngxolsvi`

`SUPABASE_SERVICE_ROLE_KEY` is for **REST/Auth API only**.  
It is **not** the Postgres password — `psql` / pooler cannot use the service_role JWT as DB password.

## Option A — SQL Editor (recommended now)

1. Open: https://supabase.com/dashboard/project/qluqhyfwpdknngxolsvi/sql/new  
2. Paste entire contents of **`scripts/apply-cloud-all.sql`** (all 7 migrations) → Run  
   Or run files in `supabase/migrations/` in numeric order.  
3. Table Editor should show: `profiles`, `projects`, `credit_balances`, `outlines`, …

## Option B — CLI

```bash
npx supabase login
npx supabase link --project-ref qluqhyfwpdknngxolsvi
npx supabase db push
```

## Option C — psql + database password

Dashboard → Project Settings → Database → connection string  
(use **database password**, not service_role):

```bash
psql "<connection-string>" -f scripts/apply-cloud-all.sql
```

## After schema exists

In `.env.local` (already has service role + AI router):

```
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
```

Optional: set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon JWT) if publishable key causes client issues.

```bash
npx next dev -p 3005
# register → create project → generate outline
```
