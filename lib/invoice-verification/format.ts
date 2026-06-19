export function toCityState(location: string | null | undefined): string {
  if (!location?.trim()) return "—";

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const state = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    return `${city}, ${state}`;
  }

  return parts[0] ?? "—";
}

export function computeInvoiceTotal(job: {
  load_value: number | null;
  fuel_surcharge: number | null;
  accessorial_charges: number | null;
}): number {
  return (
    (job.load_value ?? 0) +
    (job.fuel_surcharge && job.fuel_surcharge > 0 ? job.fuel_surcharge : 0) +
    (job.accessorial_charges && job.accessorial_charges > 0
      ? job.accessorial_charges
      : 0)
  );
}
