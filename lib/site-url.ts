const DEVELOPMENT_SITE_URL = "http://localhost:3000";
const PRODUCTION_SITE_URL = "https://publiora.appvibe.biz.id";

export function resolveSiteUrl(
  configuredUrl: string | undefined,
  nodeEnv: string | undefined,
): URL {
  const value = configuredUrl ?? (
    nodeEnv === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL
  );

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: ${value}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: ${value}`);
  }

  return url;
}
