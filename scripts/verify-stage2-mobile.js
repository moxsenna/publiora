const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  console.log('Starting local Next.js server on port 3005...');
  const server = spawn('node', ['.next/standalone/server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3005', HOSTNAME: '127.0.0.1' },
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => process.stdout.write(d));
  server.stderr.on('data', (d) => process.stderr.write(d));

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3005/');
      if (res.status < 500) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('Server failed to start in time');
    server.kill();
    process.exit(1);
  }

  console.log('Server is ready! Launching Playwright...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const viewports = [
      { name: 'android-360', width: 360, height: 780 },
      { name: 'iphone-390', width: 390, height: 844 },
      { name: 'iphone-se-375', width: 375, height: 667 },
    ];

    const projectId = 'caf7e953-73cf-4e0c-9806-deda735e71c9';

    for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        console.log(`RESPONSE ERROR [${res.status()}]:`, res.url());
      }
    });

    // Inject mock session into localStorage before any script runs
    await page.addInitScript(() => {
      window.localStorage.setItem(
        '__publiora_test_session',
        JSON.stringify({
          user: { id: 'ede1de65-48f3-4cba-b05c-02444eefc387', email: 'moxsenna@gmail.com' },
          profile: {
            id: 'ede1de65-48f3-4cba-b05c-02444eefc387',
            name: 'Bima',
            email: 'moxsenna@gmail.com',
            plan: 'pro',
            credits: 100,
          },
        })
      );
    });

    // Mock API routes
    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'ede1de65-48f3-4cba-b05c-02444eefc387', email: 'moxsenna@gmail.com' },
          profile: { name: 'Bima' },
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: projectId,
          title: 'Panduan: aaa',
          owner_id: 'ede1de65-48f3-4cba-b05c-02444eefc387',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/strategy`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: projectId,
          readiness_score: 100,
          state: {
            strategy: {
              topic: 'Sistem Repurposing 1-ke-5',
              audience: 'Content Creator dan Freelancer',
              primary_problem: 'Kesulitan konsisten membuat konten multi-platform',
              desired_outcome: 'Punya stok konten mingguan dalam 2 jam kerja',
              core_promise: 'Hemat 10 jam seminggu',
              unique_angle: 'Framework 5 komponen',
            },
          },
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/outline`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: projectId,
          title: 'Sistem Repurposing 1-ke-5: Stok Konten Mingguan dalam 2 Jam',
          description:
            'Panduan praktis berupa framework 5 komponen untuk mengubah 1 konten utama menjadi 5 format berbeda agar Content Creator dan Freelancer hemat 10 jam seminggu.',
          approved: false,
          sections: [
            {
              id: 's-1',
              title: 'Fondasi Repurposing 1-ke-5',
              summary: 'Prinsip dasar mengubah konten pilar menjadi turunan bernilai tinggi.',
              status: 'pending',
              estimated_words: 800,
            },
            {
              id: 's-2',
              title: 'Framework Eksekusi 5 Format',
              summary: 'Langkah demi langkah mengeksekusi 5 format berbeda secara sistematis.',
              status: 'pending',
              estimated_words: 1200,
            },
            {
              id: 's-3',
              title: 'Sistemasi & Template Mingguan',
              summary: 'Template kerja mingguan agar konsisten selesai dalam 2 jam.',
              status: 'pending',
              estimated_words: 950,
            },
          ],
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/sections`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(`**/api/projects/${projectId}/titles`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggestions: [] }),
      });
    });

    // Navigate to stage 2 (outline)
    console.log(`Navigating to http://127.0.0.1:3005/projects/${projectId}?step=outline...`);
    await page.goto(`http://127.0.0.1:3005/projects/${projectId}?step=outline`, {
      waitUntil: 'networkidle',
    });

    console.log('Current URL after navigation:', page.url());
    await page.screenshot({ path: path.resolve(__dirname, `../.debug-${vp.name}.png`) });

    await page.waitForTimeout(1000);

    // Check horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > window.innerWidth;
    });

    // Check if approve button and add section button are visible and within viewport
    const approveBtn = page.getByRole('button', { name: 'Setujui outline', exact: true });
    const addSectionBtn = page.getByRole('button', { name: 'Section', exact: true });

    const approveBox = await approveBtn.boundingBox();
    const addSectionBox = await addSectionBtn.boundingBox();

    console.log(`[${vp.name}] Horizontal overflow:`, hasHorizontalOverflow);
    console.log(`[${vp.name}] Approve button box:`, approveBox);
    console.log(`[${vp.name}] Add section button box:`, addSectionBox);

    const isApproveFullyVisible =
      approveBox &&
      approveBox.x >= 0 &&
      approveBox.x + approveBox.width <= vp.width + 2; // small tolerance for borders

    console.log(`[${vp.name}] Approve button within screen:`, isApproveFullyVisible);

    const isAddSectionFullyVisible =
      addSectionBox &&
      addSectionBox.x >= 0 &&
      addSectionBox.x + addSectionBox.width <= vp.width + 2;

    console.log(`[${vp.name}] Add section button within screen:`, isAddSectionFullyVisible);

    const screenshotPath = path.resolve(__dirname, `../.stage2-mobile-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[${vp.name}] Saved screenshot to:`, screenshotPath);

    await context.close();
  }
  } finally {
    if (browser) await browser.close();
    try {
      const { execSync } = require('child_process');
      execSync(`taskkill /F /T /PID ${server.pid}`);
    } catch {}
  }
  console.log('Verification completed successfully!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
