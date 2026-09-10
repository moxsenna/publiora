/**
 * Email normalization and disposable domain filtering to prevent
 * multi-account free tier abuse.
 */

// Common disposable email domains and temporary inbox services
const DISPOSABLE_DOMAINS = new Set([
  // Popular services
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "temp-mail.id",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.biz",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "spam4.me",
  "pokemail.net",
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "dispostable.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "trashmail.io",
  "getairmail.com",
  "fakeinbox.com",
  "inboxkitten.com",
  "crazymailing.com",
  "mohmal.com",
  "mohmal.in",
  "mohmal.im",
  "nada.ltd",
  "getnada.com",
  "abcvg.com",
  "dropmail.me",
  "fakemailgenerator.com",
  "fakemail.net",
  "emailfake.com",
  "generator-email.com",
  "generator.email",
  "tempail.com",
  "burnermail.io",
  "emailondeck.com",
  "minutemail.com",
  "temporary-mail.net",
  "tempmail.net",
  "mytemp.email",
  "mytempemail.com",
  "mailnesia.com",
  "maildrop.cc",
  "disposablemail.com",
  "boximail.com",
  "chacuo.net",
  "0-mail.com",
  "zillamail.com",
  "temp-inbox.com",
  "throwaway.email",
  "trash-mail.at",
  "trash-mail.com",
  "mytrashmail.com",
  "tempmailaddress.com",
  "crazymail.com",
  "incognitomail.org",
  "mailexpire.com",
  "mailcatch.com",
  "bugmenot.com",
  "mailhero.io",
  "inboxclean.com",
  "instantemailaddress.com",
  "kasmail.com",
  "mailbucket.org",
  "mailslurp.com",
  "spambox.us",
  "filzmail.com",
  "harakirimail.com",
  "trashymail.com",
  "anonymbox.com",
]);

// Domains whose subdomains are frequently generated dynamically
const DISPOSABLE_ROOTS = [
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "temp-mail.org",
  "trashmail.com",
  "mohmal.com",
  "dropmail.me",
  "10minutemail.com",
  "dispostable.com",
];

/**
 * Checks if the email contains subaddressing / plus-addressing (e.g. user+free1@gmail.com).
 */
export function hasSubaddressing(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const local = email.slice(0, at);
  return local.includes("+");
}

/**
 * Checks if the email belongs to a known disposable or temporary email provider.
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;

  const domain = email.slice(at + 1).toLowerCase().trim();
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  for (const root of DISPOSABLE_ROOTS) {
    if (domain === root || domain.endsWith(`.${root}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes email address to canonical form:
 * - Lowercases address and trims whitespace.
 * - For Gmail/Googlemail: strips all '.' in local part, strips '+tag' alias, collapses googlemail.com to gmail.com.
 * - For Outlook/Hotmail/Yahoo/iCloud: strips '+tag' alias.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  // Normalize googlemail.com -> gmail.com
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  if (domain === "gmail.com") {
    // Gmail ignores all dots
    local = local.replace(/\./g, "");
    // Remove plus alias
    const plusIndex = local.indexOf("+");
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    return `${local}@${domain}`;
  }

  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com" ||
    domain === "yahoo.com" ||
    domain === "icloud.com"
  ) {
    const plusIndex = local.indexOf("+");
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    return `${local}@${domain}`;
  }

  return `${local}@${domain}`;
}
