/**
 * Shared Auth Validation Utilities
 * Used across all registration/auth forms for consistent validation rules.
 * Matches server-side Zod schemas in server/routes/auth.ts
 */

// ─── Regex patterns ─────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

// ─── Password rule checkers ─────────────────────────────
export function checkPasswordLength(pw: string): boolean {
  return pw.length >= 8;
}
export function checkPasswordUpper(pw: string): boolean {
  return /[A-Z]/.test(pw);
}
export function checkPasswordNumber(pw: string): boolean {
  return /[0-9]/.test(pw);
}
export function isPasswordStrong(pw: string): boolean {
  return (
    checkPasswordLength(pw) && checkPasswordUpper(pw) && checkPasswordNumber(pw)
  );
}

/** Returns 0-3 strength level */
export function passwordStrengthLevel(pw: string): number {
  return [
    checkPasswordLength(pw),
    checkPasswordUpper(pw),
    checkPasswordNumber(pw),
  ].filter(Boolean).length;
}

// ─── Email validation ───────────────────────────────────
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ─── Phone validation ───────────────────────────────────
export function isValidPhone(phone: string): boolean {
  return phone.length === 0 || PHONE_REGEX.test(phone);
}

// ─── Comprehensive form validation ─────────────────────
export interface ValidationResult {
  valid: boolean;
  error: string;
}

export function validateRegistrationForm(opts: {
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}): ValidationResult {
  if (!opts.email || !opts.password) {
    return { valid: false, error: "Email and password are required" };
  }
  if (!isValidEmail(opts.email)) {
    return {
      valid: false,
      error: "Please enter a valid email address (e.g. name@example.com)",
    };
  }
  if (!checkPasswordLength(opts.password)) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!checkPasswordUpper(opts.password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!checkPasswordNumber(opts.password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (
    opts.confirmPassword !== undefined &&
    opts.password !== opts.confirmPassword
  ) {
    return { valid: false, error: "Passwords do not match" };
  }
  if (opts.phone && !isValidPhone(opts.phone)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }
  return { valid: true, error: "" };
}
