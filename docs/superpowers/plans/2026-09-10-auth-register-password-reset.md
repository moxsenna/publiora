# Register Email Confirmation & Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun alur pendaftaran email confirmation yang ramah serta alur recovery/reset kata sandi lengkap berbasis Supabase SSR PKCE callback.

**Architecture:** Menggunakan Next.js 16 App Router route handler `app/auth/callback/route.ts` untuk menukar kode PKCE/OTP ke session cookies. Menghubungkan form lupa password ke callback dengan target halaman baru `/reset-password` untuk submit kata sandi baru. Mengubah `RegisterForm` agar menampilkan kartu konfirmasi email yang jelas saat email confirmation aktif.

**Tech Stack:** Next.js 16 (Turbopack), React 19, `@supabase/ssr`, Zod, React Hook Form, Lucide React, Vitest, Playwright.

## Global Constraints
- Bahasa antarmuka: Bahasa Indonesia alami (tidak ada istilah teknis Inggris bocor pada copy pengguna).
- Sanitasi redirect: Parameter `next` harus diverifikasi sebagai relative path internal (`/` awal, tidak boleh `//`).
- Keamanan Auth: Password minimal 8 karakter. Status submit tidak boleh rentan timing attack/enumerasi email.

---

### Task 1: Validasi Skema & Copy Bahasa Indonesia untuk Reset Password

**Files:**
- Modify: `lib/validations/auth.ts`
- Modify: `lib/i18n/id/auth.ts`
- Test: `__tests__/validations/auth.reset-password.test.ts`

**Interfaces:**
- Produces: `resetPasswordSchema` dan `ResetPasswordInput`
- Produces: copy id `authId.confirmPassword`, `authId.passwordsDoNotMatch`, `authId.resetPasswordTitle`, `authId.resetPasswordSuccess`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/validations/auth.reset-password.test.ts
import { describe, it, expect } from "vitest";
import { resetPasswordSchema } from "@/lib/validations/auth";

describe("resetPasswordSchema", () => {
  it("rejects password shorter than 8 characters", () => {
    const res = resetPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    });
    expect(res.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const res = resetPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different123",
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid matching passwords", () => {
    const res = resetPasswordSchema.safeParse({
      password: "validPassword123",
      confirmPassword: "validPassword123",
    });
    expect(res.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/validations/auth.reset-password.test.ts`  
Expected: FAIL with `resetPasswordSchema is not defined`

- [ ] **Step 3: Implement resetPasswordSchema and i18n copy**

Tambahkan di `lib/validations/auth.ts`:
```typescript
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

Tambahkan di `lib/i18n/id/auth.ts`:
```typescript
confirmPassword: "Ulangi kata sandi",
passwordsDoNotMatch: "Konfirmasi kata sandi tidak cocok.",
resetPasswordTitle: "Atur ulang kata sandi",
resetPasswordDesc: "Buat kata sandi baru untuk akun Anda.",
resetPasswordSuccess: "Kata sandi berhasil diperbarui. Mengalihkan ke dashboard…",
resetTokenInvalid: "Tautan pengaturan ulang kata sandi tidak valid atau telah kedaluwarsa.",
backToForgot: "Minta tautan baru",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/validations/auth.reset-password.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/validations/auth.ts lib/i18n/id/auth.ts __tests__/validations/auth.reset-password.test.ts
git commit -m "feat(auth): add reset password validation schema and Indonesian copy"
```

---

### Task 2: Route Handler PKCE / OTP Callback (`/auth/callback`)

**Files:**
- Create: `app/auth/callback/route.ts`
- Modify: `proxy.ts`
- Test: `app/auth/callback/route.test.ts`

**Interfaces:**
- Consumes: `@supabase/ssr`, `createClient` dari `@/lib/supabase/server`
- Produces: `GET(request: Request): Promise<NextResponse>`

- [ ] **Step 1: Write the failing test**

```typescript
// app/auth/callback/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockExchange = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchange,
      verifyOtp: mockVerifyOtp,
    },
  })),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to sanitized next url on successful code exchange", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?code=valid-code&next=/dashboard");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(mockExchange).toHaveBeenCalledWith("valid-code");
  });

  it("prevents open-redirect to external URLs", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?code=valid-code&next=https://evil.com");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects to login error on failed exchange", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: null }, error: new Error("Expired") });
    const req = new Request("http://localhost:3000/auth/callback?code=expired-code");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/login?error=auth_callback_failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/auth/callback/route.test.ts`  
Expected: FAIL with missing module `./route`

- [ ] **Step 3: Implement app/auth/callback/route.ts and update proxy.ts**

Buat `app/auth/callback/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeNextUrl(next: string | null, origin: string): string {
  if (!next || typeof next !== "string") {
    return `${origin}/dashboard`;
  }
  // Safe relative paths start with single slash, not double slash (//evil.com)
  if (next.startsWith("/") && !next.startsWith("//")) {
    return `${origin}${next}`;
  }
  return `${origin}/dashboard`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  const redirectTarget = sanitizeNextUrl(next, origin);

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Auth callback code exchange failed:", error);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
      }
      return NextResponse.redirect(redirectTarget, { status: 303 });
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });
      if (error) {
        console.error("Auth callback OTP verification failed:", error);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
      }
      return NextResponse.redirect(redirectTarget, { status: 303 });
    }

    return NextResponse.redirect(`${origin}/login`, { status: 303 });
  } catch (err) {
    console.error("Auth callback unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
  }
}
```

Daftarkan rute di `proxy.ts`:
Tambahkan `"/reset-password"`, `"/auth/callback"` ke `config.matcher`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/auth/callback/route.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/auth/callback/route.ts proxy.ts app/auth/callback/route.test.ts
git commit -m "feat(auth): implement PKCE / OTP auth callback route handler"
```

---

### Task 3: Pembaruan Form Register untuk State Konfirmasi Email

**Files:**
- Modify: `store/authStore.ts`
- Modify: `components/auth/RegisterForm.tsx`
- Test: `components/auth/__tests__/RegisterForm.test.tsx`

**Interfaces:**
- Modifies: `useAuthStore.signUp` agar mengembalikan `{ confirmationRequired: boolean }` saat session belum ada, bukan throw error.
- Modifies: `RegisterForm` merender kartu konfirmasi email yang rapi.

- [ ] **Step 1: Write the failing test**

Tambahkan uji di `components/auth/__tests__/RegisterForm.test.tsx`:
```typescript
it("shows friendly email confirmation card when email confirmation is required", async () => {
  // mock signUp resolves with { confirmationRequired: true }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/auth/__tests__/RegisterForm.test.tsx`  
Expected: Test yang disesuaikan gagal.

- [ ] **Step 3: Implement clean confirmation state in authStore and RegisterForm**

Perbarui `store/authStore.ts`:
Saat `data.user` ada tapi `data.session` null:
- Panggil `stashPendingConsent(marketingEmailConsent)`.
- Set state auth `{ user: null, profile: null }`.
- Return `{ confirmationRequired: true }` atau buat helper status tanpa throw error kasar.

Perbarui `components/auth/RegisterForm.tsx`:
Saat `confirmationRequired` aktif:
- Sembunyikan form input.
- Tampilkan card bersahabat:
  - Ikon `MailCheck` warna hijau.
  - Judul: "Periksa Email Anda"
  - Deskripsi: "Tautan konfirmasi telah dikirim ke **{submittedEmail}**. Buka email dan klik tautan untuk mengaktifkan akun Anda."
  - Tombol sekunder: "Kembali ke Halaman Masuk" (`/login`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/auth/__tests__/RegisterForm.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store/authStore.ts components/auth/RegisterForm.tsx components/auth/__tests__/RegisterForm.test.tsx
git commit -m "feat(auth): provide dedicated email confirmation success view on registration"
```

---

### Task 4: Halaman & Form Reset Password Baru (`/reset-password`)

**Files:**
- Create: `components/auth/ResetPasswordForm.tsx`
- Create: `app/reset-password/page.tsx`
- Modify: `components/auth/ForgotPasswordForm.tsx`
- Test: `components/auth/__tests__/ResetPasswordForm.test.tsx`

**Interfaces:**
- Produces: `<ResetPasswordForm />` yang memanggil `supabase.auth.updateUser({ password })`
- Modifies: `ForgotPasswordForm.tsx` menggunakan `redirectTo: ${origin}/auth/callback?next=/reset-password`

- [ ] **Step 1: Write the failing test**

```typescript
// components/auth/__tests__/ResetPasswordForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ResetPasswordForm } from "../ResetPasswordForm";

const mockUpdateUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: mockUpdateUser,
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "1" } } } }),
    },
  }),
  hasSupabaseEnv: () => true,
}));

describe("ResetPasswordForm", () => {
  it("submits new password and redirects to dashboard", async () => {
    mockUpdateUser.mockResolvedValueOnce({ data: {}, error: null });
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText(/kata sandi baru/i), { target: { value: "passwordBaru123" } });
    fireEvent.change(screen.getByLabelText(/ulangi kata sandi/i), { target: { value: "passwordBaru123" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kata sandi/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "passwordBaru123" });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/auth/__tests__/ResetPasswordForm.test.tsx`  
Expected: FAIL with `ResetPasswordForm is not defined`

- [ ] **Step 3: Implement ResetPasswordForm, page, and ForgotPasswordForm update**

1. Buat `components/auth/ResetPasswordForm.tsx`:
   - Validasi menggunakan `resetPasswordSchema`.
   - Menggunakan `supabase.auth.updateUser({ password })`.
   - Menangani token invalid jika tidak ada sesi recovery aktif.
2. Buat `app/reset-password/page.tsx`:
   - Membungkus dengan `AuthShell`.
3. Perbarui `components/auth/ForgotPasswordForm.tsx`:
   - Ubah `redirectTo` ke `${window.location.origin}/auth/callback?next=/reset-password`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/auth/__tests__/ResetPasswordForm.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/auth/ResetPasswordForm.tsx app/reset-password/page.tsx components/auth/ForgotPasswordForm.tsx components/auth/__tests__/ResetPasswordForm.test.tsx
git commit -m "feat(auth): add reset password page and connect forgot-password flow"
```

---

### Task 5: Pengujian Menyeluruh (Vitest, Playwright, Build)

**Files:**
- Create: `e2e/auth-flows.spec.ts`
- Modify: `components/auth/LoginForm.tsx` (tampilkan banner ramah saat `?error=auth_callback_failed`)

- [ ] **Step 1: Write E2E test for auth views**

Buat `e2e/auth-flows.spec.ts` untuk memverifikasi:
- Render halaman `/register`, pengisian form memicu status konfirmasi.
- Render halaman `/forgot-password`, input email memicu konfirmasi terkirim.
- Render halaman `/reset-password`, validasi field kata sandi.

- [ ] **Step 2: Run all Vitest suites**

Run: `npm test`  
Expected: Semua unit test lulus tanpa error.

- [ ] **Step 3: Run Playwright E2E**

Run: `npx playwright test e2e/auth-flows.spec.ts`  
Expected: Semua test browser lulus.

- [ ] **Step 4: Run local build check**

Run: `npm run build`  
Expected: Kompilasi Turbopack sukses, halaman `/reset-password` dan `/auth/callback` ter-generate dengan benar.

- [ ] **Step 5: Commit final changes**

```bash
git add e2e/auth-flows.spec.ts components/auth/LoginForm.tsx
git commit -m "test(auth): add e2e test suite for registration and password reset flows"
```
