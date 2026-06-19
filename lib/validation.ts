import { TEXT_LIMITS, LOAD_VALUE_MAX } from "@/lib/constants";
import type { PasswordStrength } from "@/types/database";

const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHARS, "").trim();
}

export function formatMcNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  if (!digits) return "";
  return `MC-${digits}`;
}

export function formatDotNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 7);
}

export function validateMcNumber(value: string): string | null {
  const formatted = formatMcNumber(value);
  if (!formatted) return "MC Number is required.";
  if (!/^MC-\d{6,7}$/.test(formatted)) {
    return "MC Number must be MC- followed by 6 or 7 digits.";
  }
  return null;
}

export function validateDotNumber(
  value: string,
  { required = true }: { required?: boolean } = {}
): string | null {
  const formatted = formatDotNumber(value);
  if (!formatted) {
    return required ? "DOT Number is required." : null;
  }
  if (!/^\d{1,7}$/.test(formatted)) {
    return "DOT Number format is invalid — enter 1 to 7 digits only.";
  }
  return null;
}

export function validateLoadValue(value: string): string | null {
  const numeric = value.replace(/[^0-9.]/g, "");
  if (!numeric) return "Load value is required.";
  const amount = Number(numeric);
  if (Number.isNaN(amount)) return "Enter a valid dollar amount.";
  if (amount > LOAD_VALUE_MAX) {
    return `Load value cannot exceed $${LOAD_VALUE_MAX.toLocaleString()}.`;
  }
  return null;
}

export function validateTextLength(
  value: string,
  limit: number,
  label: string
): string | null {
  const sanitized = sanitizeText(value);
  if (!sanitized) return `${label} is required.`;
  if (sanitized.length > limit) {
    return `${label} must be ${limit} characters or fewer.`;
  }
  return null;
}

export function getTextCounter(value: string, limit: number): string | null {
  const remaining = limit - value.length;
  if (remaining > 20) return null;
  return `${value.length}/${limit}`;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";

  let score = 0;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;

  if (score >= 4) return "strong";
  return "fair";
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters so your account stays secure.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const sanitized = sanitizeText(email);
  if (!sanitized) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    return "Enter a valid email address so we can reach you about your loads.";
  }
  return null;
}

export function validateReferralCode(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^TVT-[A-Z0-9]{3}-\d{4}$/.test(value.trim().toUpperCase())) {
    return "Referral code looks like TVT-ABC-1234. Check the code and try again.";
  }
  return null;
}

export const FIELD_LIMITS = TEXT_LIMITS;
