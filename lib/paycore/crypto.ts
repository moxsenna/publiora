// PayCore HMAC helpers — matches PayCore src/lib/crypto.ts contracts.

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data)
  );
  return toHex(digest);
}

export async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return toHex(sig);
}

/** App → PayCore: `{timestamp}.{METHOD}.{path}.{sha256(rawBody)}` */
export async function signPayCoreRequest(params: {
  appSecret: string;
  timestamp: string;
  method: string;
  path: string;
  rawBody: string;
}): Promise<string> {
  const bodyHash = await sha256Hex(params.rawBody);
  const message = `${params.timestamp}.${params.method.toUpperCase()}.${params.path}.${bodyHash}`;
  return hmacSha256Hex(params.appSecret, message);
}

export function parseSignatureHeader(header: string | null): string | null {
  if (!header) return null;
  const t = header.trim();
  return t.startsWith("sha256=") ? t.slice(7) : t;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** PayCore → app webhook: `{timestamp}.{rawBody}` */
export async function verifyPayCoreEvent(params: {
  webhookSecret: string;
  timestampHeader: string;
  rawBody: string;
  signatureHeader: string;
  maxSkewMs?: number;
}): Promise<boolean> {
  const t = Date.parse(params.timestampHeader);
  if (Number.isNaN(t)) return false;
  const skew = Math.abs(Date.now() - t);
  if (skew > (params.maxSkewMs ?? 5 * 60_000)) return false;

  const message = `${params.timestampHeader}.${params.rawBody}`;
  const expected = await hmacSha256Hex(params.webhookSecret, message);
  const provided = parseSignatureHeader(params.signatureHeader);
  return provided !== null && timingSafeEqual(provided, expected);
}
