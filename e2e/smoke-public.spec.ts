/**
 * @smoke
 *
 * Public-page smoke tests that run without authentication.
 * These cover the marketing site, login page, and mobile layout.
 */
import { test, expect } from '@playwright/test';

test.describe('@smoke public pages', () => {
  // ---------------------------------------------------------------------------
  // Home page
  // ---------------------------------------------------------------------------

  test('home page loads with marketing content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Publiora/i);

    // Hero heading
    await expect(page.getByRole('heading', { name: /Buat ebook marketing/i })).toBeVisible();

    // Primary CTA
    await expect(page.getByRole('link', { name: /Mulai gratis/i }).first()).toBeVisible();

    // Secondary CTA
    await expect(page.getByRole('link', { name: /Lihat demo ebook/i })).toBeVisible();
  });

  test('home page has navigation link to login', async ({ page }) => {
    await page.goto('/');

    // Desktop: "Masuk" is a visible nav button
    // Mobile: it's inside a hamburger menu — so we use locator presence, not visibility
    // Count all "Masuk" links (nav + footer); at least one must be present in DOM
    const count = await page.getByRole('link', { name: 'Masuk' }).count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Login page
  // ---------------------------------------------------------------------------

  test('login page loads with sign-in form', async ({ page }) => {
    await page.goto('/login');

    // Title
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    // Email field
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password field
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Submit button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Forgot password link
    await expect(page.getByRole('link', { name: /Lupa password/i })).toBeVisible();

    // Auth switch: register link
    await expect(page.getByRole('link', { name: /Buat baru/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Mobile: no horizontal overflow
  // ---------------------------------------------------------------------------

  test('home page has no horizontal overflow on mobile viewport', async ({ page }) => {
    // Pixel 5 viewport is already set by the mobile project in config
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflowX: doc.scrollWidth - doc.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
      };
    });

    // Tolerance of 2px for subpixel rendering / scrollbar
    expect(overflow.overflowX).toBeLessThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // Navigation from home to login
  // ---------------------------------------------------------------------------

  test('login page is reachable and renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // No agent-first workspace on public pages
  // ---------------------------------------------------------------------------

  test('public pages do not show agent-first workspace UI', async ({ page }) => {
    // Home page should not have workspace-specific elements
    await page.goto('/');

    // No step navigation (would indicate workspace)
    await expect(page.getByRole('tab', { name: 'Strategy' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Outline' })).toHaveCount(0);

    // No agent picker or ChatPanel remnants
    const chatPanel = page.locator('[data-testid="chat-panel"], [class*="ChatPanel"]');
    await expect(chatPanel).toHaveCount(0);
  });
});
