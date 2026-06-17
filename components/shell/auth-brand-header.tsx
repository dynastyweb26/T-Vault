"use client";

import Image from "next/image";

export function AuthBrandHeader() {
  return (
    <div className="mb-8">
      <Image
        src="/logo.png"
        alt="T-Vault"
        width={180}
        height={48}
        className="h-9 w-auto"
        priority
      />
    </div>
  );
}
