import { tourSelector, type TourTargetId } from "@/lib/tour/constants";
import {
  assertTourActive,
  isTourAborted,
  TourAbortedError,
} from "@/lib/tour/abort";

export function waitForElement(
  target: TourTargetId,
  timeoutMs = 8000
): Promise<Element> {
  const selector = tourSelector(target);

  return new Promise((resolve, reject) => {
    assertTourActive();

    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (isTourAborted()) {
        window.clearInterval(timer);
        reject(new TourAbortedError());
        return;
      }

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

export function wait(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    assertTourActive();

    window.setTimeout(() => {
      if (isTourAborted()) {
        reject(new TourAbortedError());
        return;
      }
      resolve();
    }, ms);
  });
}
