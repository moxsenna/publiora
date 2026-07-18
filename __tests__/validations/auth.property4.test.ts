// Feature: project-setup-auth, Property 4: Invalid email formats are rejected by auth form validation

/**
 * Validates: Requirements 3.7
 *
 * Property 4: For any string that does not conform to a valid email address format,
 * the Zod validation schema SHALL reject it and return the error message
 * "Format email tidak valid".
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { loginSchema, registerSchema } from '@/lib/validations/auth';

const INVALID_EMAIL_ERROR = 'Format email tidak valid';

/**
 * Extract the email error message from a failed safeParse result.
 */
function getEmailError(
  result: ReturnType<typeof loginSchema.safeParse>,
): string | undefined {
  if (result.success) return undefined;
  const emailIssue = result.error.issues.find((i) => i.path[0] === 'email');
  return emailIssue?.message;
}

describe('Property 4: Invalid email formats are rejected by auth form validation', () => {
  it('loginSchema rejects strings without "@" with "Format email tidak valid"', () => {
    fc.assert(
      fc.property(
        // Generate strings that don't contain '@' — always invalid emails
        fc.string().filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }),
        (invalidEmail, password) => {
          const result = loginSchema.safeParse({
            email: invalidEmail,
            password,
          });

          if (result.success) return false;

          const emailError = getEmailError(result);
          return emailError === INVALID_EMAIL_ERROR;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('registerSchema rejects strings without "@" with "Format email tidak valid"', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 8 }),
        (invalidEmail, name, password) => {
          const result = registerSchema.safeParse({
            name,
            email: invalidEmail,
            password,
          });

          if (result.success) return false;

          const emailError = getEmailError(result);
          return emailError === INVALID_EMAIL_ERROR;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('loginSchema rejects strings with "@" but no valid domain (e.g. "foo@", "@bar", "foo@bar") with "Format email tidak valid"', () => {
    // Additional coverage: strings that contain '@' but still aren't valid emails
    const invalidEmailsWithAt = [
      'foo@',
      '@bar.com',
      'foo@bar',       // no TLD dot
      '@',
      'foo@.com',
      'foo@bar.',
      ' @bar.com',     // leading space (trimmed by schema, still invalid)
    ];

    for (const invalidEmail of invalidEmailsWithAt) {
      const result = loginSchema.safeParse({
        email: invalidEmail,
        password: 'somepassword',
      });

      if (result.success) {
        throw new Error(
          `Expected loginSchema to reject "${invalidEmail}" but it passed`,
        );
      }

      const emailError = getEmailError(result);
      if (emailError !== INVALID_EMAIL_ERROR) {
        throw new Error(
          `Expected error "${INVALID_EMAIL_ERROR}" for "${invalidEmail}" but got "${emailError}"`,
        );
      }
    }
  });

  it('loginSchema accepts valid email formats (sanity check)', () => {
    const validEmails = [
      'user@example.com',
      'user+tag@example.co.id',
      'firstname.lastname@domain.org',
    ];

    for (const email of validEmails) {
      const result = loginSchema.safeParse({ email, password: 'password123' });
      if (!result.success) {
        const emailError = getEmailError(result);
        if (emailError === INVALID_EMAIL_ERROR) {
          throw new Error(
            `loginSchema incorrectly rejected valid email "${email}"`,
          );
        }
      }
    }
  });
});
