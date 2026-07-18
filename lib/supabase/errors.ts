import type { AuthError } from "@supabase/supabase-js";

export function mapAuthError(error: AuthError | { message?: string; status?: number; code?: string }): string {
  const message = error?.message ?? "";
  const code = "code" in error ? String(error.code ?? "") : "";
  const lower = message.toLowerCase();

  if (
    message === "Invalid login credentials" ||
    code === "invalid_credentials"
  ) {
    return "Email atau password salah.";
  }
  if (
    message === "User already registered" ||
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    code === "user_already_exists"
  ) {
    return "Email ini sudah terdaftar.";
  }
  if (
    message === "Email not confirmed" ||
    lower.includes("email not confirmed") ||
    code === "email_not_confirmed"
  ) {
    return "Silakan konfirmasi email Anda terlebih dahulu.";
  }
  if (
    message === "Too many requests" ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("email rate limit") ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  }
  if (lower.includes("password") && (lower.includes("least") || lower.includes("short") || lower.includes("weak"))) {
    return "Password terlalu lemah. Gunakan minimal 8 karakter.";
  }
  if (lower.includes("invalid email") || code === "validation_failed") {
    return "Email tidak valid.";
  }
  if (lower.includes("signup is disabled") || lower.includes("signups not allowed")) {
    return "Pendaftaran dinonaktifkan. Hubungi admin.";
  }
  // Surface real message when useful; avoid dumping opaque codes only
  if (message && message.length < 180 && !lower.includes("json")) {
    return message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}
