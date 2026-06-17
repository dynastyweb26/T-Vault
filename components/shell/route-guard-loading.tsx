"use client";

import Image from "next/image";

export function RouteGuardLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-5">
      <Image
        src="/icon.jpeg"
        alt=""
        width={64}
        height={64}
        className="mb-6 size-16 rounded-2xl"
        aria-hidden
      />
      <div className="tv-skeleton h-3 w-32 rounded-full" />
    </div>
  );
}
