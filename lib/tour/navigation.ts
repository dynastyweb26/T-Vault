import { tourSelector, type TourTargetId } from "@/lib/tour/constants";

export function waitForElement(
  target: TourTargetId,
  timeoutMs = 8000
): Promise<Element> {
  const selector = tourSelector(target);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        window.clearInterval(timer);
        resolve(element);
        return;
      }

      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error(`Tour target not found: ${selector}`));
      }
    }, 100);
  });
}

export async function scrollTargetIntoView(target: TourTargetId): Promise<void> {
  const element = await waitForElement(target);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  await new Promise((resolve) => window.setTimeout(resolve, 350));
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
