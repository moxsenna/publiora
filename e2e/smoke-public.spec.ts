/**
 * @smoke
 *
 * Public-page smoke tests that run without authentication.
 * These cover the marketing site, login page, and mobile layout.
 */
import { test, expect } from '@playwright/test';

test.describe('@smoke public pages', () => {
  const publicMetadataCases = [
    {
      path: '/',
      title: 'Publiora — Platform Penerbitan Ebook Berbasis AI',
      description: 'Buat, terbitkan, dan distribusikan ebook pemasaran dengan bantuan AI.',
    },
    { path: '/login', title: 'Masuk | Publiora', description: 'Masuk ke akun Publiora Anda.' },
    {
      path: '/register',
      title: 'Buat Akun | Publiora',
      description: 'Buat akun Publiora untuk mulai menerbitkan ebook.',
    },
    {
      path: '/forgot-password',
      title: 'Lupa Kata Sandi | Publiora',
      description: 'Atur ulang kata sandi akun Publiora Anda.',
    },
    {
      path: '/billing/return',
      title: 'Status Pembayaran | Publiora',
      description: 'Periksa status pembayaran Publiora Anda.',
    },
  ] as const;

  for (const metadataCase of publicMetadataCases) {
    test(`${metadataCase.path} uses Indonesian document metadata`, async ({ page }) => {
      await page.goto(metadataCase.path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'id');
      await expect(page).toHaveTitle(metadataCase.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        metadataCase.description,
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Home page
  // ---------------------------------------------------------------------------

  test('home page loads with marketing content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page).toHaveTitle('Publiora — Platform Penerbitan Ebook Berbasis AI');

    // Hero heading
    await expect(page.getByRole('heading', { name: /Dari gagasan menjadi ebook/i })).toBeVisible();

    // Primary CTA
    await expect(page.getByRole('link', { name: /Mulai gratis/i }).first()).toBeVisible();

    // Secondary CTA
    await expect(page.getByRole('link', { name: /Lihat contoh ebook/i })).toBeVisible();
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
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page).toHaveTitle('Masuk | Publiora');

    // Title
    await expect(page.getByRole('heading', { name: 'Masuk ke Publiora' })).toBeVisible();

    // Email field
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password field
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Submit button
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();

    // Forgot password link
    await expect(page.getByRole('link', { name: /Lupa kata sandi/i })).toBeVisible();

    // Auth switch: register link
    await expect(page.getByRole('link', { name: /Buat akun baru/i })).toBeVisible();
  });


  for (const authCase of [
    { path: "/register", heading: "Buat akun Publiora", button: "Daftar" },
    { path: "/forgot-password", heading: "Atur ulang kata sandi", button: "Kirim tautan pengaturan ulang" },
  ] as const) {
    test(`${authCase.path} uses Indonesian auth copy without overflow`, async ({ page }) => {
      await page.goto(authCase.path);
      await expect(page.getByRole("heading", { name: authCase.heading })).toBeVisible();
      await expect(page.getByRole("button", { name: authCase.button })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
    });
  }

  test("public UI omits forbidden copy outside example content", async ({ page }) => {
    for (const path of ["/", "/login", "/register", "/forgot-password"]) {
      await page.goto(path);
      const uiText = await page.locator("header, nav, main, footer").allTextContents();
      expect(uiText.join(" ")).not.toMatch(/(?:Password|Workspace|Generate|Billing|Sign in)/i);
    }
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
    await expect(page.getByRole('heading', { name: 'Masuk ke Publiora' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
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
