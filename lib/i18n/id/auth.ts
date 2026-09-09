export const authId = {
  signIn: "Masuk",
  signUp: "Daftar",
  signOut: "Keluar",
  email: "Email",
  name: "Nama",
  password: "Kata sandi",
  forgotPassword: "Lupa kata sandi?",
  genericLoginError: "Akun belum dapat diakses. Periksa data Anda, lalu coba lagi.",
  invalidCredentials: "Email atau kata sandi salah.",
  genericRegistrationError: "Akun belum dapat dibuat. Coba lagi beberapa saat lagi.",
  confirmationRequired: "Akun berhasil dibuat. Periksa email untuk mengonfirmasi akun sebelum masuk.",
  resetSubmit: "Kirim tautan pengaturan ulang",
  resetSuccess: "Jika alamat tersebut terdaftar, petunjuk pengaturan ulang sudah dikirim melalui email.",
  confirmPassword: "Ulangi kata sandi",
  passwordsDoNotMatch: "Konfirmasi kata sandi tidak cocok.",
  resetPasswordTitle: "Atur ulang kata sandi",
  resetPasswordDesc: "Buat kata sandi baru untuk akun Anda.",
  resetPasswordSuccess: "Kata sandi berhasil diperbarui. Mengalihkan ke dashboard…",
  resetTokenInvalid: "Tautan pengaturan ulang kata sandi tidak valid atau telah kedaluwarsa.",
  backToForgot: "Minta tautan baru",
  marketingConsentLabel: "Saya ingin menerima tips membuat ebook dan informasi terbaru dari Publiora.",
} as const;

export type AuthErrorContext = "login" | "register" | "reset";

export function mapSafeAuthError(error: unknown, context: AuthErrorContext): string {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (message === "Invalid login credentials" || lower.includes("email atau password salah") || lower.includes("email atau kata sandi salah")) return authId.invalidCredentials;
  if (lower.includes("already registered") || lower.includes("sudah terdaftar")) return "Email ini sudah terdaftar. Gunakan akun tersebut atau atur ulang kata sandi.";
  if (lower.includes("too many") || lower.includes("rate limit") || lower.includes("terlalu banyak")) return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
  if (context === "login") return authId.genericLoginError;
  if (context === "register") return authId.genericRegistrationError;
  return authId.resetSuccess;
}

export function isRegistrationConfirmation(error: unknown): boolean {
  return error instanceof Error && error.message === "Akun dibuat. Cek email untuk konfirmasi, lalu login.";
}
