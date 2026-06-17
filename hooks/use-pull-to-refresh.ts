"use client";

import { useCallback, useRef, useState } from "react";

const PULL_MAX = 80;
const PULL_TRIGGER = 56;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLParagraphElement>(null);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const applyPull = useCallback((distance: number) => {
    pullDistance.current = distance;
    const content = contentRef.current;
    const indicator = indicatorRef.current;

    if (content) {
      content.style.transform =
        distance > 0 ? `translate3d(0, ${distance}px, 0)` : "";
    }

    if (indicator) {
      indicator.style.opacity = distance > 0 ? String(Math.min(1, distance / PULL_TRIGGER)) : "0";
      indicator.style.transform =
        distance > 0 ? `translate3d(0, ${distance * 0.35}px, 0)` : "";
    }
  }, []);

  const resetPull = useCallback(() => {
    applyPull(0);
    pulling.current = false;
  }, [applyPull]);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (refreshingRef.current || window.scrollY > 0) return;
    startY.current = event.touches[0].clientY;
    pulling.current = true;
    contentRef.current?.classList.add("is-pulling");
  }, []);

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!pulling.current || refreshingRef.current || window.scrollY > 0) {
        return;
      }

      const distance = Math.max(
        0,
        Math.min(PULL_MAX, event.touches[0].clientY - startY.current)
      );

      if (distance > 0) {
        event.preventDefault();
      }

      applyPull(distance);
    },
    [applyPull]
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshingRef.current) return;

    const shouldRefresh = pullDistance.current > PULL_TRIGGER;
    contentRef.current?.classList.remove("is-pulling");

    if (shouldRefresh) {
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    }

    resetPull();
  }, [onRefresh, resetPull]);

  return {
    containerRef,
    contentRef,
    indicatorRef,
    refreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
}
