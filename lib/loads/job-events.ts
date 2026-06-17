export const JOBS_CHANGED_EVENT = "tv-jobs-changed";

export function notifyJobsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(JOBS_CHANGED_EVENT));
}

export function onJobsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(JOBS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(JOBS_CHANGED_EVENT, listener);
}
