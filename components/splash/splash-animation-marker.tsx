"use client";

import { useEffect } from "react";
import {
  logSplashAnimationMount,
  markSplashAnimationStart,
} from "@/lib/splash-flow";

export function SplashAnimationMarker() {
  useEffect(() => {
    markSplashAnimationStart();
    logSplashAnimationMount();
  }, []);

  return null;
}
