// PayCore env + feature flags.

export type PayCoreConfig = {
  baseUrl: string;
  appId: string;
  keyId: string;
  appSecret: string;
  webhookSecret: string;
  returnUrl: string;
  merchantProfileId: string;
};

export function isPayCoreConfigured(): boolean {
  return Boolean(
    process.env.PAYCORE_BASE_URL &&
      process.env.PAYCORE_APP_ID &&
      process.env.PAYCORE_KEY_ID &&
      process.env.PAYCORE_APP_SECRET &&
      process.env.PAYCORE_WEBHOOK_SECRET &&
      process.env.PAYCORE_RETURN_URL
  );
}

/** Mock top-up when CREDITS_MOCK_TOPUP=true OR PayCore not fully configured. */
export function useMockBilling(): boolean {
  if (process.env.CREDITS_MOCK_TOPUP === "true") return true;
  if (process.env.CREDITS_MOCK_TOPUP === "false") {
    return !isPayCoreConfigured();
  }
  // default: mock if no paycore
  return !isPayCoreConfigured();
}

export function getPayCoreConfig(): PayCoreConfig {
  if (!isPayCoreConfigured()) {
    throw new Error("PayCore env incomplete");
  }
  return {
    baseUrl: process.env.PAYCORE_BASE_URL!.replace(/\/$/, ""),
    appId: process.env.PAYCORE_APP_ID!,
    keyId: process.env.PAYCORE_KEY_ID!,
    appSecret: process.env.PAYCORE_APP_SECRET!,
    webhookSecret: process.env.PAYCORE_WEBHOOK_SECRET!,
    returnUrl: process.env.PAYCORE_RETURN_URL!,
    // Informational only — create order uses app default merchant (Duitku V2).
    merchantProfileId:
      process.env.PAYCORE_MERCHANT_PROFILE_ID || "appvibe_duitku_v2",
  };
}
