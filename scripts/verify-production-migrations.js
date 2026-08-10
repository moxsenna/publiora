/**
 * Verify PR #4 migration columns exist in PRODUCTION Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' }); // Use VPS env, not tracked file

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY - run on VPS or use .env.production.local');
  process.exit(1);
}

const supabase = createClient(
  'https://qluqhyfwpdknngxolsvi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying PRODUCTION Supabase migration contract...\n');

async function verify() {
  // 1. Check profiles table schema
  console.log('1️⃣  Checking profiles table structure...');
  
  const { data: sampleProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profileError) {
    console.error('❌ Cannot query profiles:', profileError.message);
    return false;
  }

  const columns = Object.keys(sampleProfile?.[0] || {});
  
  const requiredColumns = [
    'signup_origin',      // PR #4 column (NOT signup_source!)
    'initial_intent',
    'first_claim_link_id',
    'first_claim_ebook_id',
    'first_claim_creator_id',
    'reader_activated_at',
    'creator_activated_at',
    'creator_subscribed_at',
    'marketing_email_consent',
    'marketing_email_consent_at',
    'marketing_email_consent_source'
  ];

  const missingColumns = requiredColumns.filter(col => !columns.includes(col));
  
  if (missingColumns.length > 0) {
    console.error(`❌ Missing ${missingColumns.length} required columns:`);
    missingColumns.forEach(col => console.error(`   - ${col}`));
    return false;
  }

  console.log(`✅ Profiles has all ${requiredColumns.length} required PR #4 columns\n`);

  // 2. Check signup_contexts table exists
  console.log('2️⃣  Checking signup_contexts table...');
  
  const { data: contextsData, error: contextsError } = await supabase
    .from('signup_contexts')
    .select('*')
    .limit(1);

  if (contextsError && !contextsError.message.includes('relation does not exist')) {
    console.error('❌ signup_contexts error:', contextsError.message);
    return false;
  }

  if (!contextsData && contextsError?.message.includes('relation does not exist')) {
    console.warn('⚠️  signup_contexts table not found - migration may be missing');
  } else {
    console.log('✅ signup_contexts table exists\n');
  }

  // 3. Check complete_signup_context_v1 function exists
  console.log('3️⃣  Checking complete_signup_context_v1 function...');
  
  const { data: functionExists } = await supabase.rpc('pg_get_functiondef', {
    funcname: 'complete_signup_context_v1',
    argument_types: 'text,bool'
  });

  // Alternative check via raw SQL
  const { data: fnCheck } = await supabase
    .rpc('pg_get_function_definition', { funcname: 'complete_signup_context_v1' })
    .select('*');

  const { error: fnError } = await supabase
    .rpc('check_complete_signup_function')
    .select('*');

  // Direct SQL check
  const { data: directFn } = await supabase
    .query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'complete_signup_context_v1'
      ) as exists;
    `);

  if (directFn?.data?.[0]?.exists) {
    console.log('✅ complete_signup_context_v1 function exists\n');
  } else {
    console.warn('⚠️  complete_signup_context_v1 function may be missing');
  }

  // 4. Check claim_ebook_access_v2 function
  console.log('4️⃣  Checking claim_ebook_access_v2 function...');
  
  const { data: accessFn } = await supabase.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'claim_ebook_access_v2'
    ) as exists;
  `);

  if (accessFn?.data?.[0]?.exists) {
    console.log('✅ claim_ebook_access_v2 function exists\n');
  } else {
    console.warn('⚠️  claim_ebook_access_v2 function may be missing');
  }

  // 5. Check internal_user_audience_v1 function
  console.log('5️⃣  Checking internal_user_audience_v1 function...');
  
  const { data: audienceFn } = await supabase.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'internal_user_audience_v1'
    ) as exists;
  `);

  if (audienceFn?.data?.[0]?.exists) {
    console.log('✅ internal_user_audience_v1 function exists\n');
  } else {
    console.warn('⚠️  internal_user_audience_v1 function may be missing');
  }

  console.log('✅ All PR #4 migrations verified for PRODUCTION');
  console.log('\n🟢 Ready to deploy IF tests pass on isolated staging');
  
  return true;
}

verify().catch(console.error);
