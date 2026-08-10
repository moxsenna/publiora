const { createClient } = require('@supabase/supabase-js');

// Use SERVICE ROLE KEY for full access
const SUPABASE_URL = 'https://qluqhyfwpdknngxolsvi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXFoeWZ3cGRrbm5neG9sc3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDMxMzI0NCwiZXhwIjoyMDk5ODg5MjQ0fQ.LM7hq5t0KpaPjXI3foGg9sn2NxQWJzfLO3L0Pr_WPNg';

console.log('\n' + '='.repeat(80));
console.log('🔍 COMPREHENSIVE MIGRATION VERIFICATION');
console.log('='.repeat(80));
console.log(`Database: qluqhyfwpdknngxolsvi.supabase.co`);
console.log('Using: SERVICE_ROLE_KEY (full read access)\n');

async function verifyAllMigrations() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  let migratedTables = [];
  let missingFeatures = [];
  
  try {
    // =========================================
    // MIGRATION 1: signup_attribution_lifecycle_v1
    // =========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Migration 1/4] signup_attribution_lifecycle_v1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check profiles table structure
    const profilesResult = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesResult.data) {
      const columns = Object.keys(profilesResult.data[0] || {});
      console.log(`Profiles table columns (${columns.length}):`);
      
      const expectedColumns = [
        'id',
        'email', 
        'created_at',
        'updated_at',
        'signup_source',      // ← Migration specific
        'signup_context_id',  // ← Migration specific
        'signup_timestamp'    // ← Migration specific
      ];
      
      const foundMigrationCols = expectedColumns.filter(col => columns.includes(col));
      const missingCols = expectedColumns.filter(col => !columns.includes(col));
      
      console.log(`\nExpected from migration: ${expectedColumns.join(', ')}`);
      console.log(`Found: ${foundMigrationCols.join(', ')}`);
      
      if (missingCols.length > 0) {
        console.log(`\n❌ MISSING COLUMNS: ${missingCols.join(', ')}`);
        missingFeatures.push('signup attribution columns in profiles');
      } else {
        console.log(`\n✅ signup_attribution_lifecycle_v1 FULLY APPLIED`);
        migratedTables.push('profiles_with_signupid_columns');
        
        // Show sample with signup data
        const { data: signupData, error } = await supabase
          .from('profiles')
          .select('id, email, signup_source, signup_context_id, created_at')
          .eq('signup_source', 'claim_link')
          .limit(3);
        
        if (!error && signupData?.length > 0) {
          console.log(`\nSample claim signup users:`);
          signupData.forEach(u => {
            console.log(`   • ${u.email} via ${u.signup_source} at ${u.created_at}`);
          });
        }
      }
    }
    
    // =========================================
    // MIGRATION 2: complete_signup_context_v1
    // =========================================
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Migration 2/4] complete_signup_context_v1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const contextsResult = await supabase
      .from('signup_contexts')
      .select('*')
      .limit(1);
    
    if (contextsResult.data && contextsResult.data.length > 0) {
      const columns = Object.keys(contextsResult.data[0]);
      console.log(`Signup contexts columns (${columns.length}):`);
      console.log(columns.join(', '));
      
      const { count, error } = await supabase
        .from('signup_contexts')
        .select('*', { count: 'exact' });
      
      console.log(`\nTotal records: ${count || 0}`);
      
      if (count === 0) {
        console.log(`\nℹ️  No signup contexts yet (users haven't signed up)`);
      } else {
        const { data: samples } = await supabase
          .from('signup_contexts')
          .select('*')
          .limit(2);
        
        console.log(`\nRecent signup contexts:`);
        samples.forEach(ctx => {
          console.log(`   Token: ${ctx.token.substring(0, 16)}...`);
          console.log(`   Email: ${ctx.target_email}`);
          console.log(`   Source: ${ctx.source}`);
          console.log(`   Status: ${ctx.status}`);
          console.log(`   Created: ${ctx.created_at}`);
          console.log('');
        });
      }
      
      console.log(`\n✅ complete_signup_context_v1 APPLIED`);
      migratedTables.push('signup_contexts');
    } else {
      console.log(`⚠️  signup_contexts table empty or error:`, contextsResult.error?.message);
    }
    
    // =========================================
    // MIGRATION 3: claim_ebook_access_v2
    // =========================================
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Migration 3/4] claim_ebook_access_v2');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const claimsResult = await supabase
      .from('claim_links')
      .select('*')
      .limit(1);
    
    if (claimsResult.data) {
      const { count, error } = await supabase
        .from('claim_links')
        .select('*', { count: 'exact' });
      
      console.log(`Claim links total: ${count || 0}`);
      
        if (count === 0) {
          console.log(`\n⚠️  NO CLAIM LINKS IN DATABASE`);
          console.log(`Need to create fixtures before testing claim flow!`);
        } else {
          const { data: samples, error } = await supabase
            .from('claim_links')
            .select('token, ebook_title, creator_email, status, expires_at')
            .limit(3);
        
          if (!error && samples && samples.length > 0) {
            console.log(`\nRecent claims:`);
            samples.forEach(c => {
              console.log(`   Token: ${c.token.substring(0, 20)}...`);
              console.log(`   Ebook: "${c.ebook_title}"`);
              console.log(`   Creator: ${c.creator_email}`);
              console.log(`   Status: ${c.status}`);
              console.log(`   Expires: ${c.expires_at || 'Never'}`);
              console.log('');
            });
          } else {
            console.log('\nWarning: Could not fetch claim samples');
          }
        }
      
      // Check for entitlements function
      const { data: entitlements, error: entError } = await supabase
        .from('entitlements')
        .select('*')
        .limit(1);
      
      if (entitlements && !entError) {
        const { count: entCount } = await supabase
          .from('entitlements')
          .select('*', { count: 'exact' });
        
        console.log(`Entitlements recorded: ${entCount || 0}`);
        
        if ((entCount || 0) > 0) {
          console.log(`\n✅ claim_ebook_access_v2 FUNCTIONAL`);
          migratedTables.push('entitlements');
        }
      }
    }
    
    // =========================================
    // MIGRATION 4: internal_user_audience_v1
    // =========================================
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Migration 4/4] internal_user_audience_v1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const usersResult = await supabase.rpc('pg_tables')
        .eq('table_schema', 'public')
        .ilike('table_name', '%user%');
      
      if (usersResult && Array.isArray(usersResult)) {
        const userTables = usersResult.map(t => t.table_name).filter(n => n !== '_users');
        console.log(`User-related tables found: ${userTables.join(', ') || 'None visible'}`);
        
        // Try to find audience-related tables
        const { data: audienceCheck, error: audError } = await supabase
          .from('audiences')
          .select('*', { count: 'exact' })
          .limit(0);
        
        if (!audError) {
          const { count: audCount } = await supabase
            .from('audiences')
            .select('*', { count: 'exact' });
          
          console.log(`Audience tables exist: YES (${audCount || 0} records)`);
          console.log(`\n✅ internal_user_audience_v1 APPLIED`);
          migratedTables.push('audiences');
        } else {
          console.log(`\nℹ️  No dedicated audience tables found`);
          console.log(`Internal features may use shared profiles table`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Could not check user tables: ${err.message}`);
    }
    
    // =========================================
    // FINAL SUMMARY
    // =========================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 COMPLETE MIGRATION VERIFICATION RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n✅ Migrated Tables: ${migratedTables.length}`);
    migratedTables.forEach((t, i) => console.log(`   ${i+1}. ${t}`));
    
    if (missingFeatures.length > 0) {
      console.log(`\n❌ Missing Features:`);
      missingFeatures.forEach(f => console.log(`   • ${f}`));
      console.log(`\n⚠️  ACTION REQUIRED: Apply remaining migration SQL`);
    }
    
    console.log('\n🎯 E2E TEST READINESS:');
    
    if (migratedTables.includes('signup_contexts')) {
      console.log(`   ✅ Signup context tracking enabled`);
    } else {
      console.log(`   ⚠️  Signup context not ready`);
    }
    
    if (migratedTables.includes('entitlements')) {
      console.log(`   ✅ Entitlement system functional`);
    } else {
      console.log(`   ⚠️  Entitlements need setup`);
    }
    
    const { data: hasClaims } = await supabase
      .from('claim_links')
      .select('id')
      .limit(1);
    
    if (hasClaims && hasClaims.length > 0) {
      console.log(`   ✅ Claim links exist - READY FOR TESTING`);
      console.log(`   📝 Run tests against real tokens in /claim/{token}`);
    } else {
      console.log(`   ⚠️  No claim links found - create fixtures first`);
      console.log(`   🛠️  Create test fixture: INSERT INTO claim_links ...`);
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log('RECOMMENDED NEXT STEPS:');
    console.log('-'.repeat(80));
    
    if (hasClaims && hasClaims.length > 0) {
      console.log(`\n1. ✅ Infrastructure ready`);
      console.log(`2. ✅ Database has claim fixtures`);
      console.log(`3. ▶️  RUN PLAYWRIGHT E2E TESTS: npm run test:e2e`);
    } else {
      console.log(`\n1. ⚠️  Create test claim link:`);
      console.log(`   INSERT INTO claim_links (token, ebook_id, creator_id, ...) VALUES (...);`);
      console.log(`2. ⏳  Verify profile columns have signup tracking`);
      console.log(`3. ▶️  Then run E2E tests`);
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyAllMigrations().catch(console.error);
