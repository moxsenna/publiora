// Duitku V2 payment methods shown in checkout UI.
// Keep in sync with PayCore allowlist (src/schemas/order.ts).

export type PaymentMethodCode =
  | "BR"
  | "NQ"
  | "SP"
  | "GQ"
  | "I1"
  | "M2"
  | "BT"
  | "BV"
  | "DM"
  | "NC"
  | "A1"
  | "FT"
  | "SQ";

export type PaymentMethodOption = {
  code: PaymentMethodCode;
  label: string;
  group: "qris" | "va" | "retail";
  description: string;
  /** Prefer for default selection when available. */
  recommended?: boolean;
};

/** Methods we expose in Publiora checkout (omit SQ — often OFF on sandbox/live projects). */
export const CHECKOUT_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    code: "NQ",
    label: "QRIS",
    group: "qris",
    description: "Scan QR (Nobu / e-wallet)",
    recommended: true,
  },
  {
    code: "SP",
    label: "ShopeePay",
    group: "qris",
    description: "QRIS ShopeePay",
  },
  {
    code: "GQ",
    label: "QRIS (alt)",
    group: "qris",
    description: "QRIS alternatif",
  },
  {
    code: "BR",
    label: "BRI VA",
    group: "va",
    description: "Virtual Account BRI",
    recommended: true,
  },
  {
    code: "I1",
    label: "BNI VA",
    group: "va",
    description: "Virtual Account BNI",
  },
  {
    code: "M2",
    label: "Mandiri VA",
    group: "va",
    description: "Virtual Account Mandiri",
  },
  {
    code: "BT",
    label: "Permata VA",
    group: "va",
    description: "Virtual Account Permata",
  },
  {
    code: "BV",
    label: "BSI VA",
    group: "va",
    description: "Virtual Account BSI",
  },
  {
    code: "DM",
    label: "Danamon VA",
    group: "va",
    description: "Virtual Account Danamon",
  },
  {
    code: "NC",
    label: "Neo / BNC VA",
    group: "va",
    description: "Virtual Account Neo Commerce",
  },
  {
    code: "A1",
    label: "ATM Bersama",
    group: "va",
    description: "VA ATM Bersama",
  },
  {
    code: "FT",
    label: "Alfamart / Pegadaian",
    group: "retail",
    description: "Bayar di gerai retail",
  },
];

export function defaultPaymentMethod(): PaymentMethodCode {
  const env = process.env.PAYCORE_DEFAULT_PAYMENT_METHOD as
    | PaymentMethodCode
    | undefined;
  if (env && CHECKOUT_PAYMENT_METHODS.some((m) => m.code === env)) return env;
  return "BR";
}

export function isPaymentMethodCode(v: unknown): v is PaymentMethodCode {
  return (
    typeof v === "string" &&
    CHECKOUT_PAYMENT_METHODS.some((m) => m.code === v)
  );
}
