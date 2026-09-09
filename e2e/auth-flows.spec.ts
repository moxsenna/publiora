import { test, expect } from "@playwright/test";

test.describe("Auth Flows E2E", () => {
  // ---------------------------------------------------------------------------
  // 1. Register Flow
  // ---------------------------------------------------------------------------
  test("register flow: shows email confirmation view on signup without error banner", async ({ page }) => {
    // Intercept signup call to simulate Supabase unconfirmed user response
    await page.route("**/auth/v1/signup*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-new-user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "calonpenulis@contoh.id",
          confirmation_sent_at: new Date().toISOString(),
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          session: null,
        }),
      });
    });

    await page.goto("/register");

    // Form fields should be visible
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    await page.locator("#name").fill("Calon Penulis");
    await page.locator("#email").fill("calonpenulis@contoh.id");
    await page.locator("#password").fill("Rahasia123!");

    // Submit form
    await page.getByRole("button", { name: "Daftar" }).click();

    // Verify confirmation view is shown
    await expect(page.getByRole("heading", { name: "Periksa Email Anda" })).toBeVisible();
    await expect(page.getByText("calonpenulis@contoh.id")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kembali ke halaman Masuk" })).toBeVisible();

    // Ensure no error alert banner is present
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Forgot Password Flow
  // ---------------------------------------------------------------------------
  test("forgot password flow: submits email and verifies callback redirectTo points to /reset-password", async ({ page }) => {
    let interceptedRedirectTo: string | null = null;

    await page.route("**/auth/v1/recover*", async (route) => {
      const reqUrl = new URL(route.request().url());
      interceptedRedirectTo = reqUrl.searchParams.get("redirect_to");

      if (!interceptedRedirectTo) {
        try {
          const postData = route.request().postDataJSON();
          interceptedRedirectTo = postData?.redirectTo || postData?.redirect_to || null;
        } catch {
          // ignore
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/forgot-password");

    const emailInput = page.locator("#forgot-email");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("pemilik@contoh.id");

    await page.getByRole("button", { name: "Kirim link reset" }).click();

    // Verify success confirmation is displayed
    await expect(page.getByText("Jika akun dengan email pemilik@contoh.id ada")).toBeVisible();

    // Verify intercepted redirectTo contains callback and /reset-password target
    expect(interceptedRedirectTo).toBeTruthy();
    expect(interceptedRedirectTo).toContain("/auth/callback?next=/reset-password");
  });

  // ---------------------------------------------------------------------------
  // 3. Reset Password Flow: Unauthenticated / Invalid Session
  // ---------------------------------------------------------------------------
  test("reset password flow: shows invalid session banner if unauthenticated", async ({ page }) => {
    // Intercept user verification calls to return unauthorized
    await page.route("**/auth/v1/user*", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid session" }),
      });
    });

    await page.goto("/reset-password");

    // Invalid session banner should appear
    await expect(
      page.getByText("Tautan pengaturan ulang kata sandi tidak valid atau telah kedaluwarsa.")
    ).toBeVisible();

    // Recovery action link should point to forgot password
    const backLink = page.getByRole("link", { name: "Minta tautan baru" });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/forgot-password");

    // Password input form should NOT be present
    await expect(page.locator("#password")).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // 4. Auth Callback Route: Open Redirect Sanitization & Error Handling
  // ---------------------------------------------------------------------------
  test("auth callback route: sanitizes external redirect and falls back to safe login", async ({ page }) => {
    // 1. External URL attack
    const res1 = await page.request.get("/auth/callback?next=https://evil.com/phish", {
      maxRedirects: 0,
    });
    expect(res1.status()).toBe(303);
    const location1 = res1.headers()["location"];
    expect(location1).toContain("/login");
    expect(location1).not.toContain("evil.com");

    // 2. Protocol-relative attack (//evil.com)
    const res2 = await page.request.get("/auth/callback?next=//evil.com", {
      maxRedirects: 0,
    });
    expect(res2.status()).toBe(303);
    const location2 = res2.headers()["location"];
    expect(location2).toContain("/login");
    expect(location2).not.toContain("//evil.com");
  });

  test("auth callback route: redirects to login with error banner on code exchange failure", async ({ page }) => {
    // Navigate directly to callback with invalid code
    await page.goto("/auth/callback?code=bad_or_expired_code");

    // Should redirect to /login?error=auth_callback_failed
    await expect(page).toHaveURL(/\/login\?error=auth_callback_failed/);

    // Login page should display friendly error banner
    await expect(
      page.getByText("Tautan verifikasi tidak valid atau telah kedaluwarsa. Silakan masuk atau minta tautan baru.")
    ).toBeVisible();
  });
});
