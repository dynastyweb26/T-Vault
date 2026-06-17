"use client";

import Image from "next/image";

export function RouteGuardLoading() {
  return (
    <div className="tv-page-canvas flex min-h-dvh flex-col items-center justify-center px-5">
      <Image
        src="/icon.png"
        alt=""
        width={64}
        height={64}
        className="tv-loading-pulse mb-8 size-16 rounded-2xl shadow-[var(--shadow-gold)]"
        aria-hidden
      />
      <div className="tv-skeleton h-1 w-28 rounded-full" />
    </div>
  );
}
