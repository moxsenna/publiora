-- === PRODUCTION ARTIFACT AUDIT SCRIPT ===
-- Run this in Supabase SQL Editor BEFORE creating isolated staging

-- 1. Auth users created during tests (last 7 days or test prefixes)
SELECT 
    email, 
    created_at, 
    last_sign_in_at, 
    raw_user_meta_data
FROM auth.users 
WHERE 
    email LIKE '%test%' 
    OR email LIKE '%e2e%' 
    OR email LIKE '@staging%' 
    OR created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 2. Profiles with E2E/test markers
SELECT 
    id, 
    email, 
    signup_origin,
    reader_activated_at,
    creator_activated_at,
    marketing_email_consent,
    created_at
FROM public.profiles 
WHERE 
    email LIKE '%test%' 
    OR email LIKE '%e2e%' 
    OR email LIKE '@staging%'
    OR created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 3. Claim links created by E2E tests
SELECT 
    id, 
    token, 
    label, 
    status,
    used_count, 
    ebook_id, 
    created_at
FROM public.claim_links 
WHERE 
    label ILIKE '%E2E%' 
    OR label ILIKE '%Test%' 
    OR created_at > NOW() - INTERVAL '7 days';

-- 4. Entitlements from E2E flows
SELECT 
    e.id,
    e.reader_id,
    e.ebook_title,
    e.ebook_slug,
    e.created_at,
    p.email as profile_email
FROM public.entitlements e
JOIN public.profiles p ON e.reader_id = p.id
WHERE 
    e.created_at > NOW() - INTERVAL '7 days'
ORDER BY e.created_at DESC;

-- 5. Published ebooks (check if E2E tests published anything)
SELECT 
    id, 
    title, 
    slug, 
    is_public,
    total_readers,
    active_claims,
    created_at
FROM public.published_ebooks 
WHERE 
    title ILIKE '%E2E%' 
    OR title ILIKE '%Test%' 
    OR created_at > NOW() - INTERVAL '7 days';

-- 6. Signup contexts (if migration applied)
SELECT 
    id,
    source,
    initial_intent,
    consumed_by_user_id,
    consumed_at,
    created_at
FROM public.signup_contexts
WHERE created_at > NOW() - INTERVAL '7 days';

-- 7. Projects created during E2E
SELECT 
    id, 
    name, 
    owner_id,
    is_template,
    created_at,
    p.email as owner_email
FROM public.projects prj
JOIN public.profiles p ON prj.owner_id = p.id
WHERE 
    prj.created_at > NOW() - INTERVAL '7 days'
ORDER BY prj.created_at DESC;

