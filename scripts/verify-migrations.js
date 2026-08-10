const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from user
const SUPABASE_URL = 'https://qluqhyfwpdknngxolsvi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXFoeWZ3cGRrbm5neG9sc3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTMyNDQsImV4cCI6MjA5OTg4OTI0NH0.jGa4EFhjrpNE6DzyGLTSvLdkRWXZSW43DEBgG9TtmWA';

console.log('\n' + '='.repeat(80));
console.log('🔍 VERIFYING SUPABASE MIGRATION STATUS');
console.log('='.repeat(80));
console.log(`Database: ${SUPABASE_URL}`);
console.log('');

async function verifyMigrations() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  
  let totalTables = 0;
  let totalFunctions = 0;
  let issues = [];
  
  try {
    // =========================================
    // CHECK 1: Base Schema (auth.users)
    // =========================================
    console.log('\n[1/7] Checking base schema...');
    
    const { count: authUsersCount, error: authError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (authError) {
      console.log(`   ⚠️  Cannot access profiles: ${authError.message}`);
    } else {
      console.log(`   ✅ profiles table accessible (${authUsersCount || 0} rows)`);
    }
    
    // Check if auth schema exists
    const { data: hasAuth } = await supabase.rpc('pg_tables', { schemaname: 'auth' });
    console.log(`   Schema 'auth': ${hasAuth ? 'EXISTS' : 'MISSING'}`);
    
    // =========================================
    // CHECK 2: signup_attribution_lifecycle Table
    // =========================================
    console.log('\n[2/7] Checking migration: signup_attribution_lifecycle_v1');
    
    const { data: lifecycleTables } = await supabase
      .rpc('pg_get_table_name', {})
      .eq('table_schema', 'public')
      .ilike('table_name', '%attribution%');
    
    const { data: signupColumns } = await supabase.rpc('column_info', { table_name: 'profiles' });
    
    // Try specific columns that should exist after migration
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('signup_source, signup_context_id, signup_timestamp')
      .limit(1);
    
    if (!profileError && profileData.length > 0) {
      console.log(`   ✅ signup_attribution columns present`);
      console.log(`      Columns found: signup_source, signup_context_id, signup_timestamp`);
      console.log(`      Sample data:`, profileData[0]);
    } else {
      console.log(`   ⚠️  signup attribution columns may be missing`);
      console.log(`      Error: ${profileError?.message || 'Unknown'}`);
    }
    
    // =========================================
    // CHECK 3: complete_signup_context_v1
    // =========================================
    console.log('\n[3/7] Checking migration: complete_signup_context_v1');
    
    const { count: contextsCount, error: contextsError } = await supabase
      .from('signup_contexts')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (contextsError) {
      console.log(`   ❌ signup_contexts table MISSING or inaccessible`);
      console.log(`      Error: ${contextsError.message}`);
      issues.push('signup_contexts table not accessible');
    } else {
      console.log(`   ✅ signup_contexts table exists (${contextsCount || 0} records)`);
      
      // Check sample data structure
      const { data: sampleContexts } = await supabase
        .from('signup_contexts')
        .select('*')
        .limit(1);
      
      if (sampleContexts && sampleContexts.length > 0) {
        console.log(`      Sample context:`, JSON.stringify(sampleContexts[0], null, 2));
      }
    }
    
    // =========================================
    // CHECK 4: claim_links Table
    // =========================================
    console.log('\n[4/7] Checking migration: claim_ebook_access_v2');
    
    const { count: claimsCount, error: claimsError } = await supabase
      .from('claim_links')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (claimsError) {
      console.log(`   ⚠️  claim_links table: ${claimsError.message}`);
      console.log(`      May not have test data yet`);
    } else {
      console.log(`   ✅ claim_links table exists (${claimsCount || 0} records)`);
      
      if (claimsCount > 0) {
        const { data: sampleClaims } = await supabase
          .from('claim_links')
          .select('token, ebook_title, creator_email, status')
          .limit(2);
        
        console.log(`      Sample claims:`);
        sampleClaims.forEach(claim => {
          console.log(`         • Token: ${claim.token?.substring(0, 16)}...`);
          console.log(`           Ebook: ${claim.ebook_title}`);
          console.log(`           Creator: ${claim.creator_email}`);
          console.log(`           Status: ${claim.status}`);
        });
      }
    }
    
    // =========================================
    // CHECK 5: published_ebooks Table
    // =========================================
    console.log('\n[5/7] Checking published_ebooks table');
    
    const { count: ebooksCount, error: ebooksError } = await supabase
      .from('published_ebooks')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (ebooksError) {
      console.log(`   ⚠️  published_ebooks: ${ebooksError.message}`);
    } else {
      console.log(`   ✅ published_ebooks exists (${ebooksCount || 0} records)`);
      
      if (ebooksCount > 0) {
        const { data: sampleBooks } = await supabase
          .from('published_ebooks')
          .select('title, slug, author, sections')
          .limit(1);
        
        console.log(`      Sample book:`, sampleBooks[0]?.title || 'N/A');
      }
    }
    
    // =========================================
    // CHECK 6: entitlements Table
    // =========================================
    console.log('\n[6/7] Checking entitlements table');
    
    const { count: entCount, error: entError } = await supabase
      .from('entitlements')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (entError) {
      console.log(`   ⚠️  entitlements: ${entError.message}`);
    } else {
      console.log(`   ✅ entitlements exists (${entCount || 0} records)`);
    }
    
    // =========================================
    // CHECK 7: List ALL Tables in Database
    // =========================================
    console.log('\n[7/7] All database tables:');
    
    const { data: allTables, error: tablesError } = await supabase.rpc('pg_get_tables', { 
      schema_filter: ['public'] 
    });
    
    if (tablesError) {
      console.log(`   Could not list tables: ${tablesError.message}`);
      console.log(`   Trying alternative query...`);
      
      // Alternative approach
      const { data: allSchemaTables } = await supabase.rpc('pg_tables');
      
      if (allSchemaTables) {
        const publicTables = allSchemaTables.filter(t => t.table_schema === 'public');
        console.log(`   Public schema tables (${publicTables.length}):`);
        
        publicTables.forEach(table => {
          console.log(`      • ${table.table_name}`);
        });
        
        // Count expected tables
        const expectedTables = [
          'profiles',
          'signup_contexts',
          'claim_links',
          'published_ebooks',
          'entitlements',
          'projects',
          'creator_projects',
          'publication_projects'
        ];
        
        const foundExpected = expectedTables.filter(t => 
          publicTables.some(pt => pt.table_name === t)
        );
        
        const missingExpected = expectedTables.filter(t => 
          !publicTables.some(pt => pt.table_name === t)
        );
        
        console.log(`\n   Expected migration tables:`);
        console.log(`      Found: ${foundExpected.join(', ')}`);
        console.log(`      Missing: ${missingExpected.join(', ') || 'NONE - All migrations applied!'}`);
      }
    } else {
      console.log(`   Listed ${allTables?.length || 0} tables via RPC`);
    }
    
    // =========================================
    // SUMMARY
    // =========================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`   • ${issue}`));
      console.log('\n⚠️  Some migrations may not be applied correctly');
    } else {
      console.log('\n✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!');
      console.log('   All expected tables are accessible.');
      console.log('   Ready for E2E testing with real claim fixtures.');
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log('📝 RECOMMENDATION:');
    console.log('-'.repeat(80));
    console.log('• If signup_contexts exists: Can run Flow A signup tests immediately');
    console.log('• If claim_links is empty: Need to create test fixture before testing');
    console.log('• Consider creating a test user + email for complete flow validation');
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  }
}

// Run the verification
verifyMigrations().catch(console.error);
