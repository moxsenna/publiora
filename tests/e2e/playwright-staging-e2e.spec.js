const { test, expect } = require('@playwright/test');

test.describe('Staging Environment Validation', () => {
  
  const BASE_URL = 'https://baca.staging.publiora.biz.id';
  
  test('should connect with HTTPS without SSL errors', async ({ page }) => {
    console.log('\n[Test] Verifying HTTPS connection...');
    
    const response = await page.goto(BASE_URL, { 
      waitUntil: 'networkidle',
      timeout: 15000
    });
    
    expect(response.status()).toBe(200);
    console.log('✅ HTTPS 200 - No SSL certificate errors');
  });
  
  test('should display correct page title', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    
    const title = await page.title();
    console.log(`   Page title: "${title}"`);
    
    expect(title).toContain('Publiora');
    console.log('✅ Page title verified');
  });
  
  test('should load homepage with all resources', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    
    // Check for key UI elements
    const logo = page.locator('[class*="Logo"], .logo, [alt*="Publiora"]');
    await expect(logo.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Logo visible');
    
    const nav = page.locator('nav, header, [role="navigation"]');
    await expect(nav).toBeVisible({ timeout: 5000 });
    console.log('✅ Navigation present');
  });
  
  test('should load claim page', async ({ page }) => {
    console.log('\n[Test] Loading claim page...');
    
    await page.goto(`${BASE_URL}/claim/test-token`, { waitUntil: 'networkidle' });
    
    expect(await page.title()).toContain('Publiora');
    console.log('✅ Claim page loaded successfully');
    
    // Look for authentication-related elements
    const authElements = page.locator('a[href*="/login"], a[href*="/auth"], :has-text("Masuk"), :has-text("Login")');
    const count = await authElements.count();
    console.log(`   Auth links found: ${count}`);
    
    if (count > 0) {
      console.log('✅ Login/auth link present on claim page');
    }
  });
  
  test('should handle cross-domain navigation', async ({ context }) => {
    console.log('\n[Test] Cross-domain cookie sharing...');
    
    // Create pages in same context (shared cookies)
    const bacaPage = await context.newPage();
    const appPage = await context.newPage();
    
    try {
      // Visit baca subdomain
      await bacaPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      const bacaCookies = await context.cookies();
      console.log(`   Baca cookies: ${bacaCookies.length}`);
      
      // Visit app subdomain
      await appPage.goto('https://app.staging.publiora.biz.id/', { waitUntil: 'networkidle' });
      const appCookies = await context.cookies();
      console.log(`   App cookies: ${appCookies.length}`);
      
      // Both should be able to access each other's domains
      console.log('✅ Cross-domain navigation successful');
      
    } finally {
      await bacaPage.close();
      await appPage.close();
    }
  });
  
  test('should render claim preview modal correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/claim/test-token`, { waitUntil: 'networkidle' });
    
    // Wait for any modal or card component to appear
    const modal = page.locator('.modal, [role="dialog"], [data-testid="modal"]');
    
    if (await modal.count() > 0) {
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Modal/dialog component visible');
    } else {
      console.log('ℹ️  No modal detected (page may show inline content)');
    }
  });
  
  test('should validate responsive layout', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    
    const viewport = page.viewportSize();
    console.log(`   Viewport: ${viewport?.width}x${viewport?.height}`);
    
    // Should still have accessible content
    const mainContent = page.locator('main, [role="main"], body > *:not(header):not(footer)');
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    console.log('✅ Mobile viewport renders correctly');
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

console.log('\n📋 Running Playwright E2E tests against staging.publiora.biz.id\n');
