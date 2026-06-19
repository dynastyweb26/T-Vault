"use client";

import dynamic from "next/dynamic";

export const SplashBootLazy = dynamic(
  () =>
    import("@/components/splash/splash-boot").then((mod) => ({
      default: mod.SplashBoot,
    })),
  { ssr: false }
);
