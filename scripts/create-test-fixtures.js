const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = 'https://qluqhyfwpdknngxolsvi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsdXFoeWZ3cGRrbm5neG9sc3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDMxMzI0NCwiZXhwIjoyMDk5ODg5MjQ0fQ.LM7hq5t0KpaPjXI3foGg9sn2NxQWJzfLO3L0Pr_WPNg';

console.log('\n' + '='.repeat(80));
console.log('🔍 CREATING TEST CLAIM FIXTURE');
console.log('='.repeat(80));

async function createTestFixture() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  try {
    // Step 1: Find published ebooks to link claims to
    console.log('\n[Step 1/3] Finding published ebooks...');
    
    const { data: ebooks, error: ebookError } = await supabase
      .from('published_ebooks')
      .select('id, title, slug, author, project_id, creator_id')
      .limit(3);
    
    if (ebookError) {
      console.log(`❌ Error fetching ebooks: ${ebookError.message}`);
      return;
    }
    
    if (!ebooks || ebooks.length === 0) {
      console.log('❌ No published ebooks found in database');
      console.log('   Please publish at least one ebook first');
      return;
    }
    
    console.log(`✅ Found ${ebooks.length} published ebooks:`);
    ebooks.forEach(ebook => {
      console.log(`   • "${ebook.title}" (${ebook.slug})`);
    });
    
    const sampleBook = ebooks[0];
    console.log(`\nUsing ebook for test fixtures: "${sampleBook.title}"`);
    
    // Step 2: Create test claim tokens
    console.log('\n[Step 2/3] Creating claim fixtures...');
    
    const existingClaims = await supabase
      .from('claim_links')
      .select('token')
      .limit(10);
    
    const usedTokens = existingClaims?.data?.map(c => c.token) || [];
    
    const newTokens = [
      'test-claim-token-flow-a',
      'demo-access-token-2026',
      'preview-ebook-reader-token'
    ];
    
    let createdCount = 0;
    
    for (const token of newTokens) {
      if (usedTokens.includes(token)) {
        console.log(`   ⏭️  Token already exists: ${token}`);
        continue;
      }
      
      try {
        const { data, error } = await supabase
          .from('claim_links')
          .insert({
            ebook_id: sampleBook.id,
            token: token,
            label: `Test fixture - ${token}`,
            status: 'active',
            max_uses: null,  // Unlimited
            used_count: 0,
            expires_at: null  // Never expires
          })
          .select()
          .single();
        
        if (error) {
          console.log(`   ❌ Failed to create ${token}: ${error.message}`);
        } else {
          console.log(`   ✅ Created claim link: ${token}`);
          createdCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error creating ${token}: ${err.message}`);
      }
    }
    
    if (createdCount === 0) {
      console.log(`\n⚠️  No new claim links created (tokens may already exist)`);
    } else {
      console.log(`\n✅ Created ${createdCount} new claim fixtures`);
    }
    
    // Step 3: Verify fixtures
    console.log('\n[Step 3/3] Verifying claim fixtures...');
    
    const { count: totalClaims, error: countError } = await supabase
      .from('claim_links')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (!countError && totalClaims) {
      console.log(`\nTotal active claim links: ${totalClaims}`);
      
      const { data: claims } = await supabase
        .from('claim_links')
        .select('token, label, status, created_at')
        .limit(5);
      
      if (claims) {
        console.log('\nActive claim tokens:');
        claims.forEach(claim => {
          console.log(`   Token: ${claim.token}`);
          console.log(`   Label: ${claim.label}`);
          console.log(`   Status: ${claim.status}`);
          console.log('');
        });
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 FIXTURE CREATION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n✅ Published ebooks available: ${ebooks.length}`);
    console.log(`   Sample: "${sampleBook.title}"`);
    
    if (totalClaims > 0) {
      console.log(`✅ Total active claim links: ${totalClaims}`);
      console.log(`\n🎯 READY FOR E2E TESTING:`);
      console.log(`   Test URLs: /claim/{token}`);
      console.log(`   Example: https://baca.staging.publiora.biz.id/claim/test-claim-token-flow-a`);
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log('NEXT STEPS:');
    console.log('-'.repeat(80));
    console.log('1. Visit claim page: https://baca.staging.publiora.biz.id/claim/test-claim-token-flow-a');
    console.log('2. Click "Daftar" or "Sign Up" link');
    console.log('3. Register as new user');
    console.log('4. Verify profile created with signup attribution');
    console.log('5. Check entitlement created in entitlements table');
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestFixture().catch(console.error);
