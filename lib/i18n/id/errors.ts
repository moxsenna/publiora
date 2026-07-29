export const uiErrorMessagesId = {
  AUTH_INVALID_CREDENTIALS: "Email atau kata sandi salah.",
  invalid_credentials: "Email atau kata sandi salah.",
  unauthorized: "Silakan masuk untuk melanjutkan.",
  not_found: "Data yang diminta tidak ditemukan.",
  validation_error: "Periksa kembali data yang Anda masukkan.",
  unavailable: "Layanan sedang tidak tersedia. Coba lagi nanti.",
  rate_limit: "Terlalu banyak percobaan. Coba lagi nanti.",
  insufficient_credits: "Kredit tidak mencukupi.",
} as const;

export type UiErrorCode = keyof typeof uiErrorMessagesId;

const unknownUiErrorMessageId = "Terjadi kesalahan. Silakan coba lagi.";

export function getUiErrorMessage(error?: unknown): string {
  const code = typeof error === "string"
    ? error
    : error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;

  return code && Object.prototype.hasOwnProperty.call(uiErrorMessagesId, code)
    ? uiErrorMessagesId[code as UiErrorCode]
    : unknownUiErrorMessageId;
}
