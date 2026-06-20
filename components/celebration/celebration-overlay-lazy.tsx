"use client";

import dynamic from "next/dynamic";

export const CelebrationOverlayLazy = dynamic(
  () =>
    import("@/components/celebration/celebration-overlay").then((mod) => ({
      default: mod.CelebrationOverlay,
    })),
  { ssr: false }
);
