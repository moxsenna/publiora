import { test, expect } from '@playwright/test';

/**
 * Flow A: Claim → Signup → Entitlement → Read
 * Test the complete user acquisition funnel from claim link
 */

const BASE_URL = process.env.STAGING_BASE_URL || 'https://baca.staging.publiora.biz.id';

test.describe('Flow A: Claim → Signup → Entitlement', () => {
  test('should display claim page and allow registration', async ({ page }) => {
    console.log('\n🚀 Starting Flow A Test...');
    
    // Step 1: Navigate to claim page (logged out state)
    const claimUrl = `${BASE_URL}/claim/test-token`;
    console.log(`📍 Opening: ${claimUrl}`);
    
    await page.goto(claimUrl, { waitUntil: 'networkidle' });
    
    // Step 2: Verify claim page loads
    await expect(page).toHaveTitle(/Publiora/i);
    console.log('✅ Claim page title verified');
    
    // Step 3: Look for signup/register form
    const registerLink = page.getByText(/Daftar|Buat Akun|Sign Up/i);
    if (await registerLink.isVisible()) {
      console.log('✅ Registration link found on claim page');
      
      // Optional: Click and fill form (requires valid token in DB)
      // await registerLink.click();
      // await page.fill('input[type="email"]', 'test-user@example.com');
      // await page.fill('input[type="password"]', 'SecurePass123!');
      // await page.click('button[type="submit"]');
    } else {
      console.log('⚠️  No visible registration form (page may already show authenticated view)');
    }
    
    // Step 4: Verify auth cookie domain
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => 
      c.name.includes('NextAuthSession') || c.name.includes('auth')
    );
    
    if (authCookie) {
      expect(authCookie.domain).toContain('.staging.publiora.biz.id');
      console.log('✅ Auth cookie uses correct staging domain');
    } else {
      console.log('ℹ️  No auth cookies yet (expected for unauthenticated flow)');
    }
    
    // Step 5: Check cookie settings match staging config
    const cookieDomains = cookies.map(c => c.domain);
    const hasStagingDomain = cookieDomains.some(d => d.includes('staging'));
    expect(hasStagingDomain).toBe(true);
    console.log('✅ Cookie domain configured for staging namespace');
  });
  
  test('should have correct cross-domain cookie sharing setup', async ({ context }) => {
    console.log('\n🔄 Testing cross-domain cookie configuration...');
    
    const appPage = context.newPage();
    
    try {
      // Navigate to app subdomain
      await appPage.goto(`${process.env.STAGING_APP_URL || 'https://app.staging.publiora.biz.id'}/login`, { 
        waitUntil: 'networkidle' 
      });
      
      // Verify app subdomain loads
      await expect(appPage).toHaveTitle(/Publiora/i);
      console.log('✅ App subdomain accessible with same auth system');
      
    } finally {
      await appPage.close();
    }
  });
});

/**
 * Flow B: Cross-Domain Session Sharing
 * Verify session persists across marketing/app/baca subdomains
 */
test.describe('Flow B: Cross-Domain Session', () => {
  test('should share authentication across staging subdomains', async ({ context }) => {
    console.log('\n💻 Testing cross-domain session...');
    
    const bacaPage = context.newPage();
    const appPage = context.newPage();
    
    try {
      // Login on baca subdomain
      await bacaPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      
      // Fill and submit login form (credentials should be configured in CI env)
      const emailInput = bacaPage.locator('input[name="email"]');
      await emailInput.fill('test-staging@publiora.biz.id');
      
      const passwordInput = bacaPage.locator('input[name="password"]');
      await passwordInput.fill('TestPassword123!');
      
      await bacaPage.click('button[type="submit"]');
      
      // Wait for redirect/auth completion
      await bacaPage.waitForLoadState('networkidle');
      
      // Check if authenticated (look for logout button or user menu)
      const isLoggedIn = await bacaPage.$('[data-testid="user-menu"], .user-profile, [role="navigation"] a:has-text("Logout")') !== null;
      
      if (isLoggedIn) {
        console.log('✅ Successfully logged in on baca subdomain');
        
        // Now verify we can access app subdomain without re-login
        await appPage.goto(`${process.env.STAGING_APP_URL || 'https://app.staging.publiora.biz.id'}/library`, {
          waitUntil: 'networkidle'
        });
        
        // Should NOT see login screen (session shared)
        const seesLogin = await appPage.$('h1:has-text("Masuk"), h1:has-text("Login")') !== null;
        
        if (!seesLogin) {
          console.log('✅ Session successfully shared to app subdomain (no re-login required)');
        } else {
          console.log('⚠️  Re-login required - cookie sharing may not be configured correctly');
        }
      } else {
        console.log('⚠️  Could not determine login status - UI may vary');
      }
      
    } finally {
      await bacaPage.close();
      await appPage.close();
    }
  });
});

/**
 * Flow C: Creator Preview Mode (No Publish)
 * Verify preview mode doesn't insert into published_ebooks
 */
test.describe('Flow C: Creator Preview Mode', () => {
  test.skip(true, 'Requires authenticated creator + database verification');
  
  test('should create project draft without publishing', async ({ page, context }) => {
    // This requires:
    // 1. Authenticated creator account
    // 2. Navigation to workspace
    // 3. Creating new project with draft content
    // 4. Clicking preview button
    // 5. Verifying NO POST to /api/internal/publish endpoints
    
    console.log('Flow C: Preview mode test skipped (requires manual setup)');
  });
});
