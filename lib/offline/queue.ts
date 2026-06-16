export interface OfflineQueueItem {
  id: string;
  type: "job_create" | "job_update" | "expense_create";
  payload: Record<string, unknown>;
  localUpdatedAt: string;
  createdAt: string;
}

export interface ConflictData {
  jobId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  serverUpdatedAt: string;
  localUpdatedAt: string;
}

const QUEUE_KEY = "tvault_offline_queue";
const CONFLICT_KEY = "tvault_offline_conflict";

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineItem(
  item: Omit<OfflineQueueItem, "id" | "createdAt">
): void {
  const queue = getOfflineQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
}

export function removeQueueItem(id: string): void {
  saveOfflineQueue(getOfflineQueue().filter((i) => i.id !== id));
}

export function setConflict(conflict: ConflictData | null): void {
  if (typeof window === "undefined") return;
  if (conflict) {
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(conflict));
  } else {
    localStorage.removeItem(CONFLICT_KEY);
  }
}

export function getConflict(): ConflictData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONFLICT_KEY);
    return raw ? (JSON.parse(raw) as ConflictData) : null;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

const VOICE_DRAFT_KEY = "tvault_voice_draft";

export function saveVoiceDraft(blob: Blob): void {
  if (typeof window === "undefined") return;
  blob.arrayBuffer().then((buf) => {
    const b64 = btoa(
      new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), "")
    );
    localStorage.setItem(VOICE_DRAFT_KEY, b64);
  });
}

export async function loadVoiceDraft(): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  const b64 = localStorage.getItem(VOICE_DRAFT_KEY);
  if (!b64) return null;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "audio/webm" });
}

export function clearVoiceDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VOICE_DRAFT_KEY);
}
