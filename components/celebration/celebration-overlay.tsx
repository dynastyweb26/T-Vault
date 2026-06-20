"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";
import { CelebrationCssFallback } from "@/components/celebration/celebration-css-fallback";
import {
  CELEBRATION_CSS_DISMISS_MS,
  CELEBRATION_LOTTIE_DISMISS_MS,
} from "@/lib/celebration/constants";
import {
  getCachedCelebrationAssets,
  isCelebrationReady,
  type CelebrationDotLottieReact,
} from "@/lib/celebration/preload";

type CelebrationMode = "lottie" | "css";

type CelebrationOverlayProps = {
  trigger: boolean;
  onComplete: () => void;
};

export function CelebrationOverlay({ trigger, onComplete }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CelebrationMode>("css");
  const [DotLottieReact, setDotLottieReact] = useState<CelebrationDotLottieReact | null>(
    null
  );
  const [animationData, setAnimationData] = useState<ArrayBuffer | null>(null);
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const dismissedRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearDismissTimer();
    setVisible(false);
    setDotLottie(null);
    onComplete();
  }, [clearDismissTimer, onComplete]);

  const scheduleDismiss = useCallback(
    (celebrationMode: CelebrationMode) => {
      clearDismissTimer();
      dismissTimerRef.current = window.setTimeout(
        dismiss,
        celebrationMode === "lottie"
          ? CELEBRATION_LOTTIE_DISMISS_MS
          : CELEBRATION_CSS_DISMISS_MS
      );
    },
    [clearDismissTimer, dismiss]
  );

  useEffect(() => {
    if (!trigger) return;

    dismissedRef.current = false;

    if (isCelebrationReady()) {
      const { DotLottieReact: Lottie, animationData: data } =
        getCachedCelebrationAssets();
      if (Lottie && data) {
        setDotLottieReact(() => Lottie);
        setAnimationData(data);
        setMode("lottie");
      } else {
        setMode("css");
      }
    } else {
      setMode("css");
    }

    setVisible(true);
  }, [trigger]);

  useEffect(() => {
    if (!visible) return;
    scheduleDismiss(mode);
    return clearDismissTimer;
  }, [visible, mode, scheduleDismiss, clearDismissTimer]);

  useEffect(() => {
    if (mode !== "lottie" || !dotLottie) return;

    const onAnimationComplete = () => dismiss();
    dotLottie.addEventListener("complete", onAnimationComplete);
    return () => {
      dotLottie.removeEventListener("complete", onAnimationComplete);
    };
  }, [dotLottie, dismiss, mode]);

  if (!visible) return null;

  return (
    <div
      role="presentation"
      aria-hidden
      className="tv-celebration-overlay fixed inset-0 z-[100] flex items-center justify-center"
      onClick={dismiss}
    >
      <div className="tv-celebration-content h-64 w-64 max-w-[70vw]">
        {mode === "lottie" && DotLottieReact && animationData ? (
          <DotLottieReact
            data={animationData}
            autoplay
            loop={false}
            dotLottieRefCallback={setDotLottie}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <CelebrationCssFallback />
        )}
      </div>
    </div>
  );
}
