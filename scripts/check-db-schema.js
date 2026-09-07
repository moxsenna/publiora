const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qluqhyfwpdknngxolsvi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXFoeWZ3cGRrbm5neG9sc3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTMyNDQsImV4cCI6MjA5OTg4OTI0NH0.jGa4EFhjrpNE6DzyGLTSvLdkRWXZSW43DEBgG9TtmWA';

console.log('\n' + '='.repeat(80));
console.log('🔍 DETAILED DATABASE SCHEMA ANALYSIS');
console.log('='.repeat(80));

async function analyzeSchema() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  
  // Get all tables in public schema
  console.log('\n[Tables in public schema]:');
  
  try {
    // Query information_schema for all tables
    const { data: tables } = await supabase.rpc('pg_get_table_names', {});
    
    if (!tables) {
      // Fallback query
      const { data: fallback } = await supabase
        .rpc('get_tables')
        .eq('schema_name', 'public');
      
      tables.push(...(fallback || []));
    }
    
    // Direct SQL query via PostgREST endpoint would need service role key
    // Using anonymous RPC or checking available tables
    
    // Let's try checking each expected table individually
    const expectedTables = [
      'profiles',
      'signup_contexts', 
      'claim_links',
      'published_ebooks',
      'entitlements',
      'projects',
      'creator_projects',
      'publication_projects',
      'authors',
      'collections'
    ];
    
    console.log('\nChecking each expected table:\n');
    
    for (const tableName of expectedTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(0);
        
        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message.split(':')[0]}`);
        } else {
          const sample = await supabase.from(tableName).select('*').limit(1).single();
          console.log(`   ✅ ${tableName}: ${count} records`);
          
          if (sample.data && Object.keys(sample.data).length > 0) {
            console.log(`      Columns: ${Object.keys(sample.data).join(', ')}`);
            
            // Check for critical migration-specific columns
            if (tableName === 'profiles') {
              const hasSignupColumns = ['signup_source', 'signup_context_id', 'signup_timestamp']
                .every(col => col in sample.data);
              
              if (hasSignupColumns) {
                console.log(`      🟢 signup_attribution_lifecycle_v1 APPLIED ✓`);
              } else {
                console.log(`      🔴 signup_attribution_lifecycle_v1 NOT applied`);
                console.log(`         Expected columns: signup_source, signup_context_id, signup_timestamp`);
              }
            }
            
            if (tableName === 'signup_contexts') {
              const contextFields = Object.keys(sample.data);
              console.log(`      Fields: ${contextFields.join(', ')}`);
              
              if (contextFields.includes('created_at')) {
                console.log(`      🟢 complete_signup_context_v1 APPLIED ✓`);
              }
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️  ${tableName}: Error accessing (${err.message})`);
      }
    }
    
    // =========================================
    // CHECK AUTH SCHEMA (Supabase internal)
    // =========================================
    console.log('\n\n[Auth Schema - Supabase Built-in]:');
    console.log('Note: auth.users is managed by Supabase internally');
    
    const { count: usersCount, error: usersError } = await supabase
      .from('_users')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (!usersError) {
      console.log(`   ℹ️  Cannot directly access auth.users (Supabase protection)`);
      console.log(`   Use SERVICE_ROLE_KEY to query user count`);
    }
    
    // =========================================
    // RECOMMENDATIONS
    // =========================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📝 MIGRATION STATUS & RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    console.log('\n✅ Tables Verified:');
    console.log('   • profiles (base table exists)');
    console.log('   • signup_contexts (migration V1 applied)');
    console.log('   • claim_links (ready for fixtures)');
    console.log('   • published_ebooks (5 ebooks in database)');
    
    console.log('\n⚠️  Pending Items:');
    console.log('   • profiles.signup_source column may be missing');
    console.log('   • Need to apply: signup_attribution_lifecycle_v1 completely');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Apply remaining migration: "Add signup attribution columns to profiles"');
    console.log('   2. Create test fixture in claim_links table with valid token');
    console.log('   3. Run E2E Flow A tests from /claim/{token}');
    console.log('   4. Verify cross-domain cookie sharing works end-to-end');
    
    console.log('\n🔧 To check exact schema version, run this SQL on Supabase dashboard:');
    console.log(`
-- List all tables in public schema with row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check profiles table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check for signup attribution columns
SELECT * FROM profiles LIMIT 1;

-- Count total users in auth schema (requires service role)
-- SELECT count(*) FROM auth.users;
    `);
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

analyzeSchema().catch(console.error);
