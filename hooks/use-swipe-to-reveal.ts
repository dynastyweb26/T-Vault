"use client";

import { useCallback, useRef } from "react";

interface SwipeToRevealOptions {
  /** Maximum reveal distance in pixels (negative direction). */
  maxOffset: number;
  /** Snap open threshold as a fraction of maxOffset (0–1). */
  snapThreshold?: number;
}

function setTranslateX(element: HTMLElement, x: number) {
  element.style.transform = `translate3d(${x}px, 0, 0)`;
}

export function useSwipeToReveal({
  maxOffset,
  snapThreshold = 0.5,
}: SwipeToRevealOptions) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const openOffset = useRef(0);

  const snapTo = useCallback((offset: number) => {
    const element = surfaceRef.current;
    if (!element) return;

    openOffset.current = offset;
    element.classList.remove("is-dragging");
    setTranslateX(element, offset);
  }, []);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const element = surfaceRef.current;
    if (!element || event.touches.length !== 1) return;

    startX.current = event.touches[0].clientX;
    dragging.current = true;
    element.classList.add("is-dragging");
  }, []);

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!dragging.current || event.touches.length !== 1) return;

      const element = surfaceRef.current;
      if (!element) return;

      const delta = event.touches[0].clientX - startX.current;
      const next =
        delta < 0
          ? Math.max(delta, -maxOffset)
          : Math.min(0, openOffset.current + delta);

      currentX.current = next;
      setTranslateX(element, next);

      if (delta > 8 && openOffset.current < 0) {
        event.preventDefault();
      }
    },
    [maxOffset]
  );

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const threshold = -maxOffset * snapThreshold;
    snapTo(currentX.current < threshold ? -maxOffset : 0);
  }, [maxOffset, snapThreshold, snapTo]);

  const reset = useCallback(() => {
    dragging.current = false;
    currentX.current = 0;
    snapTo(0);
  }, [snapTo]);

  return {
    surfaceRef,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    reset,
  };
}
