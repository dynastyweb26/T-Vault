export function formatUsPhoneDisplay(digits: string): string {
  const normalized = digits.replace(/\D/g, "");
  if (normalized.length !== 10) return digits;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

export function buildTelHref(digits: string): string {
  const normalized = digits.replace(/\D/g, "");
  if (normalized.length === 10) {
    return `tel:+1${normalized}`;
  }
  if (normalized.length === 11 && normalized.startsWith("1")) {
    return `tel:+${normalized}`;
  }
  return `tel:${normalized}`;
}
