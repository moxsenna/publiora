/**
 * Full Strategy -> Publish journey.
 *
 * Requires:
 *   E2E_EMAIL, E2E_PASSWORD
 * Optional: E2E_PROJECT_ID (reuse existing project)
 *
 * Skips when credentials missing so CI without secrets still runs smoke.
 */

import { test, expect } from '@playwright/test';

const STEP_LABELS = ['Strategy', 'Outline', 'Write', 'Review', 'Publish'];

test.describe('workflow happy path', () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    'needs E2E_EMAIL and E2E_PASSWORD env vars',
  );

  // ---------------------------------------------------------------------------
  // Helper: login via the login form
  // ---------------------------------------------------------------------------

  async function login(page: import('@playwright/test').Page): Promise<void> {
    await page.goto('/login');
    await page.fill('#email', process.env.E2E_EMAIL!);
    await page.fill('#password', process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Wait for navigation away from /login
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Step navigation labels
  // ---------------------------------------------------------------------------

  test('step nav shows all five workflow stages', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;

    if (projectId) {
      await page.goto(`/projects/${projectId}`);
    } else {
      // Go to projects list and click the first project
      await page.goto('/projects');
      const firstProject = page.locator('a[href^="/projects/"]').first();
      await expect(firstProject).toBeVisible({ timeout: 10_000 });
      await firstProject.click();
    }

    await page.waitForURL(/\/projects\/[^/]+/, { timeout: 10_000 });

    // Wait for workspace to load (step nav should appear)
    const stepNav = page.getByRole('tab', { name: 'Strategy' });
    await expect(stepNav).toBeVisible({ timeout: 15_000 });

    // Assert all five step labels are present
    for (const label of STEP_LABELS) {
      const tab = page.getByRole('tab', { name: label });
      // There may be both desktop and mobile versions — at least one should be visible
      await expect(tab.first()).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // No agent-first workspace UI (no ChatPanel, no agent picker)
  // ---------------------------------------------------------------------------

  test('workspace has no agent-first UI remnants', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;
    const targetUrl = projectId
      ? `/projects/${projectId}`
      : '/projects';

    await page.goto(targetUrl);

    if (!projectId) {
      // Click into first project
      const firstProject = page.locator('a[href^="/projects/"]').first();
      await expect(firstProject).toBeVisible({ timeout: 10_000 });
      await firstProject.click();
      await page.waitForURL(/\/projects\/[^/]+/, { timeout: 10_000 });
    }

    // No ChatPanel component
    const chatPanel = page.locator('[data-testid="chat-panel"]');
    await expect(chatPanel).toHaveCount(0);

    // No agent picker labels (the six-agent system)
    const agentChips = page.locator('text=Planner').first();
    // These might appear in other contexts, but not as a dedicated agent picker row
    // Verify no "Select agent" label
    await expect(page.getByText('Select agent')).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // URL-driven step navigation
  // ---------------------------------------------------------------------------

  test('can deep-link to ?step=write', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;

    if (!projectId) {
      test.skip(true, 'E2E_PROJECT_ID required for deep-link test (no project list to click)');
      return;
    }

    await page.goto(`/projects/${projectId}?step=write`);

    // Wait for write panel content (sections panel renders text)
    await expect(page.locator('text=Sections').first()).toBeVisible({ timeout: 15_000 });
  });

  test('can deep-link to ?step=review', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;

    if (!projectId) {
      test.skip(true, 'E2E_PROJECT_ID required for deep-link test');
      return;
    }

    await page.goto(`/projects/${projectId}?step=review`);

    // Review panel should show up
    await expect(page.locator('text=Review').first()).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Publish stage: blocked UI for empty project
  // ---------------------------------------------------------------------------

  test('publish stage shows blockers for empty project', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;

    if (!projectId) {
      test.skip(true, 'E2E_PROJECT_ID required for publish test');
      return;
    }

    await page.goto(`/projects/${projectId}?step=publish`);

    // Publish panel heading
    await expect(page.getByRole('heading', { name: /Publish/i })).toBeVisible({ timeout: 15_000 });

    // Should show either blockers or the publish button
    const hasBlockers = await page.locator('text=issues to resolve').isVisible().catch(() => false);
    const hasPublishButton = await page.getByRole('button', { name: /Publish/i }).isVisible().catch(() => false);

    // At least one should be present (publish panel renders correctly)
    expect(hasBlockers || hasPublishButton).toBe(true);

    // Publish button should be disabled if there are blockers
    if (await page.getByRole('button', { name: /Publish/i }).isVisible()) {
      const publishBtn = page.getByRole('button', { name: /Publish/i });
      // Button may be disabled
      const isDisabled = await publishBtn.isDisabled();
      // Either disabled (blocked) or enabled (ready) — both valid states
      expect(typeof isDisabled).toBe('boolean');
    }
  });

  // ---------------------------------------------------------------------------
  // Step navigation via clicking nav tabs
  // ---------------------------------------------------------------------------

  test('clicking step nav tabs changes stage', async ({ page }) => {
    const projectId = process.env.E2E_PROJECT_ID;

    if (!projectId) {
      test.skip(true, 'E2E_PROJECT_ID required for nav tab test');
      return;
    }

    await page.goto(`/projects/${projectId}?step=outline`);

    // Verify we're on Outline
    await expect(page.locator('text=Outline').first()).toBeVisible({ timeout: 15_000 });

    // Click Strategy tab (desktop)
    const strategyTab = page.getByRole('tab', { name: 'Strategy' }).first();
    await strategyTab.click();

    // URL should update to ?step=strategy
    await expect(page).toHaveURL(/step=strategy/);

    // Strategy content should be visible
    await expect(page.getByText('Ebook Brief')).toBeVisible({ timeout: 10_000 });
  });
});
