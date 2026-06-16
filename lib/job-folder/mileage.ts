export function estimateMiles(
  pickup: string | null,
  delivery: string | null
): number | null {
  if (!pickup?.trim() || !delivery?.trim()) return null;
  const combined = `${pickup}|${delivery}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const miles = 250 + (Math.abs(hash) % 750);
  return miles;
}
