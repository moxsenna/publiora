/**
 * Workspace shell tests: step navigation labels, deep-linking, and keyboard shortcuts.
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID
 * Skips when credentials or project ID missing so CI without secrets still runs smoke.
 */

import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const PROJECT_ID = process.env.E2E_PROJECT_ID;

test.describe('workspace shell', () => {
  test.skip(
    !EMAIL || !PASSWORD || !PROJECT_ID,
    'needs E2E_EMAIL, E2E_PASSWORD, and E2E_PROJECT_ID env vars',
  );

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#email', EMAIL!);
    await page.fill('#password', PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15_000,
    });
  });

  // ---------------------------------------------------------------------------
  // WorkspaceStepNav labels
  // ---------------------------------------------------------------------------

  test('WorkspaceStepNav shows Strategy Outline Write Review Publish', async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_ID}`);

    const nav = page.getByRole('navigation', { name: 'Workflow stages' });
    await expect(nav.first()).toBeVisible({ timeout: 15_000 });

    const expectedLabels = ['Strategy', 'Outline', 'Write', 'Review', 'Publish'];

    for (const label of expectedLabels) {
      const tab = page.getByRole('tab', { name: label }).first();
      await expect(tab).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // Deep-link ?step=write
  // ---------------------------------------------------------------------------

  test('deep-link ?step=write shows write panel', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=write`);

    const writeTab = page.getByRole('tab', { name: 'Write' }).first();
    await expect(writeTab).toHaveAttribute('aria-selected', 'true');
  });

  // ---------------------------------------------------------------------------
  // Deep-link ?step=review
  // ---------------------------------------------------------------------------

  test('deep-link ?step=review shows review panel', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=review`);

    const reviewTab = page.getByRole('tab', { name: 'Review' }).first();
    await expect(reviewTab).toHaveAttribute('aria-selected', 'true');
  });

  // ---------------------------------------------------------------------------
  // Deep-link ?step=publish
  // ---------------------------------------------------------------------------

  test('deep-link ?step=publish shows publish panel', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=publish`);

    const publishHeading = page.getByRole('heading', { name: /Publish/i });
    await expect(publishHeading).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcut: press 1 for Strategy
  // ---------------------------------------------------------------------------

  test('keyboard shortcut "1" navigates to Strategy', async ({ page }) => {
    // Start at write so we can navigate away
    await page.goto(`/projects/${PROJECT_ID}?step=write`);
    await page.waitForURL(/step=write/, { timeout: 10_000 });

    // Press 1
    await page.keyboard.press('Digit1');

    // URL should change to strategy
    await expect(page).toHaveURL(/step=strategy/);

    const strategyTab = page.getByRole('tab', { name: 'Strategy' }).first();
    await expect(strategyTab).toHaveAttribute('aria-selected', 'true');
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcut: press 5 for Publish
  // ---------------------------------------------------------------------------

  test('keyboard shortcut "5" navigates to Publish', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await page.waitForURL(/step=strategy/, { timeout: 10_000 });

    // Press 5
    await page.keyboard.press('Digit5');

    // URL should change to publish
    await expect(page).toHaveURL(/step=publish/);
  });

  // ---------------------------------------------------------------------------
  // Clicking a step tab changes URL step param
  // ---------------------------------------------------------------------------

  test('clicking Outline tab sets ?step=outline in URL', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    const outlineTab = page.getByRole('tab', { name: 'Outline' }).first();
    await outlineTab.click();

    await expect(page).toHaveURL(/step=outline/);
  });

  test('clicking Write tab sets ?step=write in URL', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=outline`);

    const writeTab = page.getByRole('tab', { name: 'Write' }).first();
    await writeTab.click();

    await expect(page).toHaveURL(/step=write/);
  });

  test('clicking Review tab sets ?step=review in URL', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=write`);

    const reviewTab = page.getByRole('tab', { name: 'Review' }).first();
    await reviewTab.click();

    await expect(page).toHaveURL(/step=review/);
  });
});
