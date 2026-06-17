const VOICE_DRAFT_KEY = "tvault_voice_draft";

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

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
