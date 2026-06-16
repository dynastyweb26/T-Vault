import { SCROLL_STORAGE_KEY } from "@/lib/job-folder/constants";

export function saveLoadsScrollPosition(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
}

export function restoreLoadsScrollPosition(): void {
  if (typeof window === "undefined") return;
  const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
  if (!saved) return;
  requestAnimationFrame(() => {
    window.scrollTo(0, Number(saved));
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);
  });
}
