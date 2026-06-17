"use client";

import Image from "next/image";

export function AuthBrandHeader() {
  return (
    <div className="mb-10">
      <Image
        src="/logo.png"
        alt="T-Vault"
        width={180}
        height={48}
        className="tv-brand-mark h-10 w-auto"
        priority
      />
    </div>
  );
}
