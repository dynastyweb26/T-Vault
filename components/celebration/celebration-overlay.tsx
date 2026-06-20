"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";

const CELEBRATION_LOTTIE_URL =
  "https://lottie.host/0d8f7291-283c-433a-8011-6b1e2abf5383/AosZyd4bW2.lottie";
const DISMISS_FALLBACK_MS = 2500;

type DotLottieReactComponent =
  typeof import("@lottiefiles/dotlottie-react").DotLottieReact;

type CelebrationOverlayProps = {
  trigger: boolean;
  onComplete: () => void;
};

export function CelebrationOverlay({ trigger, onComplete }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [DotLottieReact, setDotLottieReact] = useState<DotLottieReactComponent | null>(
    null
  );
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const dismissedRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setVisible(false);
    setDotLottie(null);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) return;

    dismissedRef.current = false;
    setVisible(true);

    void import("@lottiefiles/dotlottie-react").then((mod) => {
      setDotLottieReact(() => mod.DotLottieReact);
    });
  }, [trigger]);

  useEffect(() => {
    if (!visible || !DotLottieReact) return;

    fallbackTimerRef.current = window.setTimeout(dismiss, DISMISS_FALLBACK_MS);
    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [visible, DotLottieReact, dismiss]);

  useEffect(() => {
    if (!dotLottie) return;

    const onAnimationComplete = () => dismiss();
    dotLottie.addEventListener("complete", onAnimationComplete);
    return () => {
      dotLottie.removeEventListener("complete", onAnimationComplete);
    };
  }, [dotLottie, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="presentation"
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={dismiss}
    >
      <div className="h-64 w-64 max-w-[70vw]">
        {DotLottieReact ? (
          <DotLottieReact
            src={CELEBRATION_LOTTIE_URL}
            autoplay
            loop={false}
            dotLottieRefCallback={setDotLottie}
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
      </div>
    </div>
  );
}
