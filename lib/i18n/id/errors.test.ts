import { describe, expect, it } from "vitest";
import { getUiErrorMessage } from "@/lib/i18n/id";

describe("getUiErrorMessage", () => {
  it("maps stable auth and API codes", () => {
    expect(getUiErrorMessage("AUTH_INVALID_CREDENTIALS")).toBe("Email atau kata sandi salah.");
    expect(getUiErrorMessage("invalid_credentials")).toBe("Email atau kata sandi salah.");
    expect(getUiErrorMessage("unauthorized")).toBe("Silakan masuk untuk melanjutkan.");
    expect(getUiErrorMessage("not_found")).toBe("Data yang diminta tidak ditemukan.");
    expect(getUiErrorMessage("validation_error")).toBe("Periksa kembali data yang Anda masukkan.");
  });

  it("never exposes provider messages or unknown values", () => {
    const fallback = "Terjadi kesalahan. Silakan coba lagi.";
    expect(getUiErrorMessage()).toBe(fallback);
    expect(getUiErrorMessage("SENSITIVE_PROVIDER_MESSAGE")).toBe(fallback);
    expect(getUiErrorMessage({ code: "unknown", message: "Raw provider failure" })).toBe(fallback);
    expect(getUiErrorMessage({ code: "AUTH_INVALID_CREDENTIALS", message: "Raw provider failure" })).toBe(
      "Email atau kata sandi salah.",
    );
  });
});
