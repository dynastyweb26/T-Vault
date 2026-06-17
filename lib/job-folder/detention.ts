export const DETENTION_FREE_MINUTES = 120;
export const DEFAULT_DETENTION_RATE = 50;

const POSTGRES_TIMESTAMP_RE =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:([Zz])|([+-]\d{2})(?::?(\d{2}))?)?$/;

export function normalizeTimerStart(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseTimerStartMs(value: unknown): number {
  const normalized = normalizeTimerStart(value);
  if (!normalized) return Number.NaN;

  const trimmed = normalized.trim();
  if (!trimmed) return Number.NaN;

  if (/^\d{10,13}$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const ms = numeric < 1e12 ? numeric * 1000 : numeric;
      if (Number.isFinite(ms)) return ms;
    }
  }

  let ms = Date.parse(trimmed);
  if (!Number.isNaN(ms)) return ms;

  const withT = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  ms = Date.parse(withT);
  if (!Number.isNaN(ms)) return ms;

  const withZ = withT
    .replace(/([+-]\d{2})$/, "$1:00")
    .replace(/\+00:00$/, "Z")
    .replace(/\+00$/, "Z");
  ms = Date.parse(withZ);
  if (!Number.isNaN(ms)) return ms;

  const match = trimmed.match(POSTGRES_TIMESTAMP_RE);
  if (!match) return Number.NaN;

  const [, datePart, hours, minutes, seconds, fraction, zulu, offsetHours, offsetMinutes] =
    match;
  const millis = fraction ? Number(fraction.slice(0, 3).padEnd(3, "0")) : 0;

  if (zulu) {
    return Date.UTC(
      Number(datePart.slice(0, 4)),
      Number(datePart.slice(5, 7)) - 1,
      Number(datePart.slice(8, 10)),
      Number(hours),
      Number(minutes),
      Number(seconds),
      millis
    );
  }

  if (offsetHours) {
    const sign = offsetHours.startsWith("-") ? -1 : 1;
    const absHours = Math.abs(Number(offsetHours));
    const mins = Number(offsetMinutes ?? "0");
    const utcMs = Date.UTC(
      Number(datePart.slice(0, 4)),
      Number(datePart.slice(5, 7)) - 1,
      Number(datePart.slice(8, 10)),
      Number(hours),
      Number(minutes),
      Number(seconds),
      millis
    );
    return utcMs - sign * (absHours * 60 + mins) * 60 * 1000;
  }

  return Date.UTC(
    Number(datePart.slice(0, 4)),
    Number(datePart.slice(5, 7)) - 1,
    Number(datePart.slice(8, 10)),
    Number(hours),
    Number(minutes),
    Number(seconds),
    millis
  );
}

export function isParseableTimerStart(value: unknown): boolean {
  return !Number.isNaN(parseTimerStartMs(value));
}

export function resolveDetentionTimerStart(
  job: { detention_start_time?: string | null } | null,
  activeSession: { timer_start?: string | null } | null
): string | null {
  const candidates = [job?.detention_start_time, activeSession?.timer_start];

  for (const candidate of candidates) {
    const normalized = normalizeTimerStart(candidate);
    if (normalized && isParseableTimerStart(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function getDetentionElapsedSeconds(timerStart: unknown): number {
  const startMs = parseTimerStartMs(timerStart);
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
}

export function formatTimerDisplay(totalSeconds: number): string {
  const elapsed = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minute${mins === 1 ? "" : "s"}`;
  if (mins === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${mins} minute${mins === 1 ? "" : "s"}`;
}

export function calculateDetentionOwed(
  totalMinutes: number,
  hourlyRate = DEFAULT_DETENTION_RATE
): number {
  const billableMinutes = Math.max(0, totalMinutes - DETENTION_FREE_MINUTES);
  return Math.round((billableMinutes * hourlyRate) / 60);
}

export function isDetentionBillable(totalMinutes: number): boolean {
  return totalMinutes >= DETENTION_FREE_MINUTES;
}
