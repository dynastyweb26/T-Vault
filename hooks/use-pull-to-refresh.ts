"use client";

import { useCallback, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = event.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return;
      const distance = Math.max(0, event.touches[0].clientY - startY.current);
      setPullDistance(Math.min(distance, 80));
    },
    [isPulling]
  );

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > 56) {
      await onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [onRefresh, pullDistance]);

  return {
    containerRef,
    pullDistance,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
