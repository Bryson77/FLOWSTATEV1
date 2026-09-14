/**
 * User-safe error sanitization and validation helpers for Saktus.
 * Prevents raw database errors, schema leaks, SQL constraints, or server exceptions
 * from appearing anywhere in student-facing applications.
 */

// Patterns indicating raw database, server infrastructure, or runtime exceptions
const INTERNAL_ERROR_PATTERNS = [
  /violat(es?|ing)/i,
  /constraint/i,
  /column/i,
  /relation/i,
  /table/i,
  /schema/i,
  /foreign key/i,
  /unique key/i,
  /primary key/i,
  /syntax error/i,
  /database/i,
  /postgres/i,
  /postgrest/i,
  /pgrst/i,
  /supabase/i,
  /row-level security/i,
  /\brls\b/i,
  /permission denied/i,
  /cannot read propert/i,
  /undefined is not/i,
  /is not a function/i,
  /stack trace/i,
  /check environment bindings/i,
  /failed to fetch/i,
  /network\s?error/i,
  /internal server error/i,
  /jwt/i,
  /resend/i,
  /pg_/i,
  /null value in/i,
  /operator does not exist/i,
  /invalid input syntax/i,
];

/**
 * Returns a user-safe, student-friendly error message.
 * Ensures internal database schema and errors are never leaked.
 */
export function getSafeErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;

  const raw =
    typeof error === 'string'
      ? error
      : (error as any)?.message ||
        (error as any)?.error_description ||
        (error as any)?.details ||
        '';

  if (!raw || typeof raw !== 'string') return fallback;

  const lower = raw.toLowerCase().trim();

  // Authentication & account checks
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Wrong email or password.';
  }
  if (
    lower.includes('user already registered') ||
    (lower.includes('already exists') && lower.includes('email'))
  ) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password must be at least 6 characters.';
  }
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (
    lower.includes('jwt expired') ||
    lower.includes('token expired') ||
    lower.includes('not authenticated') ||
    lower.includes('unauthorized')
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  // Network & connectivity
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('network request failed')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Database Unique Constraints / Duplicates
  if (lower.includes('unique constraint') || lower.includes('duplicate key')) {
    if (lower.includes('code')) {
      return 'This code already exists. Please choose a different one.';
    }
    return 'This item already exists.';
  }

  // Missing values / Not-null constraints
  if (lower.includes('not-null') || lower.includes('null value in')) {
    return 'Fill this in: please provide all required details.';
  }

  // Security / Permissions
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return "You don't have permission to perform this action.";
  }

  // Check if it matches internal database / code patterns
  for (const pattern of INTERNAL_ERROR_PATTERNS) {
    if (pattern.test(lower)) {
      return fallback;
    }
  }

  // If it's a short, human-readable sentence without technical syntax, allow it
  if (
    raw.length < 120 &&
    !raw.includes('{') &&
    !raw.includes('}') &&
    !raw.includes('(') &&
    !raw.includes(')') &&
    !raw.includes('SELECT') &&
    !raw.includes('INSERT') &&
    !raw.includes('UPDATE')
  ) {
    return raw;
  }

  return fallback;
}

/**
 * Standardized "Fill this in" validation helper for forms
 */
export function getRequiredFieldError(fieldName: string): string {
  return `Fill this in: ${fieldName} is required.`;
}
