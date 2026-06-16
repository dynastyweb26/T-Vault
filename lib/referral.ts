export function buildReferralPrefix(fullName: string): string {
  const letters = fullName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  if (letters.length > 0) return letters.padEnd(3, "X");
  return "USR";
}

export function generateReferralCode(fullName: string): string {
  const prefix = buildReferralPrefix(fullName);
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `TVT-${prefix}-${digits}`;
}
