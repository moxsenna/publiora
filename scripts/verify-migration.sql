-- VERIFICATION QUERY FOR MIGRATION #1
-- Paste this in Supabase SQL Editor to verify migration success

-- 1. Check profiles table has new columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND (column_name LIKE '%signup%' 
     OR column_name LIKE '%activated%' 
     OR column_name IN ('initial_intent', 'first_claim_link_id'));

-- Expected output: 12 rows including signup_origin, reader_activated_at, etc.

-- 2. Check signup_contexts table exists
SELECT * 
FROM information_schema.tables 
WHERE table_name = 'signup_contexts';

-- Expected: 1 row showing signup_contexts table

-- 3. Test complete_signup_context_v1 RPC (from migration #2)
-- Run after migration #2 is applied:
SELECT 
    complete_signup_context_v1(
        'test-token-xyz',  -- raw token string (will be hashed internally)
        'https://app.publiora.bid.id/callback'
    );

-- Expected: Record with {id, token_hash, source, etc.}

-- 4. Test claim_ebook_access_v2 RPC (from migration #3)
-- Run after migration #3 is applied:
SELECT 
    claim_ebook_access_v2(
        'reader-uuid-here',  -- Replace with actual UUID format
        'ebook-uuid-here'
    );

-- Expected: jsonb object with claim_result status

-- 5. Check internal_user_audience_v1 view (from migration #4)
-- Run after all migrations are applied:
SELECT 
    user_id,
    signing_source,
    derived_segment
FROM internal_user_audience_v1
LIMIT 5;

-- Expected: List of users with their attribution segments
