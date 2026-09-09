# Spesifikasi Desain: Sistem Register Email Confirmation & Forgot/Reset Password Publiora

Tanggal: 2026-09-10  
Status: Disetujui  
Target: Auth Flow Publiora (Next.js 16 App Router + Supabase SSR)

---

## 1. Latar Belakang & Masalah
* Pendaftaran akun via `/register` telah memiliki form nama, email, password, dan persetujuan pemasaran. Namun ketika fitur **Confirm email** aktif di Supabase, flow melempar error string `"Akun dibuat. Cek email untuk konfirmasi, lalu login."` yang memicu tampilan error merah pada UI bukannya kartu sukses konfirmasi.
* Halaman `/forgot-password` memanggil `resetPasswordForEmail` dengan `redirectTo: /login`. Tidak ada penanganan pertukaran token recovery, dan tidak ada halaman untuk memasukkan kata sandi baru. Akibatnya pengguna yang lupa kata sandi tidak pernah bisa mereset akun mereka.
* Aplikasi belum memiliki route handler `/auth/callback` yang menukar `code` PKCE atau `token_hash` menjadi sesi autentikasi resmi pada cookie SSR.

---

## 2. Arsitektur & Alur Kerja

### 2.1 Alur Pendaftaran (Register)
1. Pengguna membuka `/register` dan mengisi form (`name`, `email`, `password`).
2. Client memanggil `authStore.signUp(...)`:
   * Mengirim `emailRedirectTo: `${origin}/auth/callback?next=/dashboard`` ke Supabase `signUp`.
   * Jika respons menghasilkan `session === null` (konfirmasi email aktif):
     * Simpan status consent ke local storage jika ada.
     * Return status `{ confirmationRequired: true, email }`.
3. `RegisterForm` merender kartu status sukses konfirmasi email:
   * Ikon amplop / centang hijau.
   * Teks instruksi ramah: "Tautan konfirmasi telah dikirim ke **{email}**. Buka email dan klik tautan untuk mengaktifkan akun Anda."
   * Tombol sekunder "Kembali ke halaman Masuk".
4. Saat tautan email diklik, browser diarahkan ke `/auth/callback?code=...&next=/dashboard`.

### 2.2 Alur Pertukaran Token Email (`/auth/callback`)
1. Route handler GET pada `app/auth/callback/route.ts` menerima query parameter:
   * `code`: Kode auth PKCE dari Supabase.
   * `token_hash` & `type`: Alternatif token hash verifikasi OTP (`signup`, `recovery`, `invite`, dll).
   * `next`: Path internal tujuan setelah sesi aktif (default: `/dashboard`).
2. Keamanan Open-Redirect:
   * `next` divalidasi harus berupa relative path diawali satu garis miring `/`, tidak boleh diawali `//`, dan tidak boleh mengandung protokol eksternal.
3. Eksekusi pertukaran:
   * Jika terdapat `code`: panggil `supabase.auth.exchangeCodeForSession(code)`.
   * Jika terdapat `token_hash` & `type`: panggil `supabase.auth.verifyOtp({ token_hash, type })`.
4. Jika berhasil:
   * Redirect ke path `next` yang telah disanitasi.
5. Jika gagal (misal token kadaluwarsa):
   * Redirect ke `/login?error=auth_callback_failed`.

### 2.3 Alur Lupa & Atur Ulang Kata Sandi (Forgot & Reset Password)
1. Pengguna membuka `/forgot-password` dan memasukkan email terdaftar.
2. `ForgotPasswordForm` memanggil:
   ```typescript
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
   });
   ```
3. UI menampilkan pesan netral anti-enumerasi akun: "Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim ke kotak masuk Anda."
4. Pengguna klik tautan di email → masuk ke `/auth/callback?code=...&next=/reset-password` → sesi recovery tercipta → diarahkan ke `/reset-password`.
5. Halaman `app/reset-password/page.tsx` + `ResetPasswordForm.tsx`:
   * Memeriksa keberadaan sesi user aktif.
   * Jika tidak ada sesi valid: tampilkan state "Tautan tidak valid atau telah kedaluwarsa" dengan tombol kembali ke `/forgot-password`.
   * Jika ada sesi: form meminta "Kata sandi baru" dan "Ulangi kata sandi baru" (validasi Zod: min 8 karakter dan bernilai sama).
   * Submit memanggil `supabase.auth.updateUser({ password: newPassword })`.
   * Sukses: tampilkan toast sukses, lalu redirect pengguna langsung ke `/dashboard`.

---

## 3. Rincian Komponen & File

### File Baru:
1. `app/auth/callback/route.ts`
   * Route handler GET server-side dengan `@supabase/ssr`.
2. `app/reset-password/page.tsx`
   * Halaman publik berbalut `AuthShell` judul "Atur ulang kata sandi".
3. `components/auth/ResetPasswordForm.tsx`
   * Form interaktif dengan validasi realtime, eye icon toggle visibility, dan feedback error jelas.

### File Diperbarui:
1. `lib/validations/auth.ts`
   * Menambahkan `resetPasswordSchema` dan tipe data `ResetPasswordInput`.
2. `lib/i18n/id/auth.ts`
   * Menambahkan copy Bahasa Indonesia: label konfirmasi password, pesan error token, dan status sukses reset.
3. `components/auth/RegisterForm.tsx`
   * Menampilkan kartu sukses konfirmasi email tanpa throw error palsu.
4. `store/authStore.ts`
   * Mengatur `signUp` agar mengembalikan flag `confirmationRequired: boolean` alih-alih melempar error.
5. `components/auth/ForgotPasswordForm.tsx`
   * Mengarahkan `redirectTo` ke `/auth/callback?next=/reset-password`.
6. `components/auth/LoginForm.tsx`
   * Menampilkan banner info jika ada parameter `?error=auth_callback_failed` atau `?confirmed=1`.
7. `proxy.ts`
   * Mendaftarkan rute `/reset-password` dan `/auth/callback` pada middleware proxy session.

---

## 4. Rencana Pengujian & Verifikasi
1. **Unit Test (Vitest)**:
   * `lib/validations/auth.ts`: Uji validasi panjang kata sandi dan kecocokan konfirmasi kata sandi.
   * `app/auth/callback/route.ts`: Uji handling kode PKCE, sanitasi parameter redirect `next`, dan penanganan error token.
   * `store/authStore.ts`: Uji penanganan registrasi ketika session belum langsung diberikan (confirmation mode).
2. **E2E & UI Test (Playwright)**:
   * Test pendaftaran: Memverifikasi pengisian form `/register` menampilkan kartu konfirmasi email.
   * Test lupa sandi: Memverifikasi pengisian form `/forgot-password` menampilkan status sukses pengiriman.
   * Test reset sandi: Memverifikasi render elemen dan validasi input di `/reset-password`.
3. **Build Verifikasi**:
   * Menjalankan `npm test` dan `npm run build` memastikan zero regression.
