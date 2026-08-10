/**
 * Check if production database contains test artifacts
 */

const { createClient } = require('@supabase/supabase-js');

// Load from actual VPS file location
require('dotenv').config({ path: '/opt/publiora/.env.production' });

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  Using demo credentials for schema inspection only');
  
  // Demo credentials - won't write anything
  const supabase = createClient(
    'https://qluqhyfwpdknngxolsvi.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
} else {
  console.log('✅ Authenticated as service role');
  const supabase = createClient(
    'https://qluqhyfwpdknngxolsvi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function checkProduction() {
  console.log('\n🔍 Scanning PRODUCTION database for test artifacts...\n');
  
  // 1. Profiles with test markers
  console.log('1️⃣  Checking profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);
    
  if (pError) {
    console.log(`   ⚠️  Error: ${pError.message}`);
  } else {
    console.log(`   Found ${profiles.length} profile(s)`);
    if (profiles?.[0]) {
      const cols = Object.keys(profiles[0]);
      console.log(`   Columns: ${cols.slice(0, 8).join(', ')}...`);
      
      const hasPR4 = cols.includes('signup_origin');
      console.log(`   PR #4 migration applied: ${hasPR4 ? 'YES ✅' : 'NO ❌'}`);
    }
  }
  
  // 2. Claim links
  console.log('\n2️⃣  Checking claim_links...');
  const { data: claims, error: cError } = await supabase
    .from('claim_links')
    .select('id, token, label, used_count, created_at')
    .limit(10);
    
  if (claims && claims.length > 0) {
    console.log(`   Found ${claims.length} claim link(s)`);
    claims.forEach(c => {
      const isTest = c.label?.toLowerCase().includes('e2e') || 
                     c.token.includes('E2E') ||
                     c.token.includes('TEST');
      console.log(`   - ${c.token}: "${c.label}" [${isTest ? 'TEST ⚠️' : 'PRODUCTION'}]`);
    });
  } else {
    console.log('   Empty or no access');
  }
  
  // 3. Entitlements
  console.log('\n3️⃣  Checking entitlements...');
  const { data: entitles, error: eError } = await supabase
    .from('entitlements')
    .select('*')
    .limit(5);
    
  if (entitles) {
    console.log(`   Found ${entitles.length} entitlement(s)`);
  }
  
  // 4. Published ebooks
  console.log('\n4️⃣  Checking published_ebooks...');
  const { data: ebooks, error: ebError } = await supabase
    .from('published_ebooks')
    .select('*')
    .limit(5);
    
  if (ebooks) {
    console.log(`   Found ${ebooks.length} published ebook(s)`);
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('-----------');
  console.log('Database appears to be LIVE/PRODUCTION');
  console.log('Do NOT run E2E tests here - will pollute live data\n');
}

checkProduction();
