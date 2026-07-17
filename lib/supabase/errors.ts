import type { AuthError } from '@supabase/supabase-js';

export function mapAuthError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Email atau password salah.';
    case 'User already registered':
      return 'Email ini sudah terdaftar.';
    case 'Email not confirmed':
      return 'Silakan konfirmasi email Anda terlebih dahulu.';
    case 'Too many requests':
      return 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.';
    default:
      return 'Terjadi kesalahan. Silakan coba lagi.';
  }
}
