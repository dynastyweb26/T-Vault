export const DEFAULT_PAGE_SIZE = 20;

export function encodeJobCursor(updatedAt: string, id: string): string {
  return btoa(JSON.stringify({ u: updatedAt, i: id }));
}

export function decodeJobCursor(
  cursor: string
): { updatedAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(atob(cursor)) as { u?: string; i?: string };
    if (typeof parsed.u === "string" && typeof parsed.i === "string") {
      return { updatedAt: parsed.u, id: parsed.i };
    }
  } catch {
    return null;
  }
  return null;
}

export function encodeExpenseCursor(createdAt: string, id: string): string {
  return btoa(JSON.stringify({ c: createdAt, i: id }));
}

export function decodeExpenseCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(atob(cursor)) as { c?: string; i?: string };
    if (typeof parsed.c === "string" && typeof parsed.i === "string") {
      return { createdAt: parsed.c, id: parsed.i };
    }
  } catch {
    return null;
  }
  return null;
}

export function encodeVoiceNoteCursor(createdAt: string, id: string): string {
  return btoa(JSON.stringify({ c: createdAt, i: id }));
}

export function decodeVoiceNoteCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(atob(cursor)) as { c?: string; i?: string };
    if (typeof parsed.c === "string" && typeof parsed.i === "string") {
      return { createdAt: parsed.c, id: parsed.i };
    }
  } catch {
    return null;
  }
  return null;
}
