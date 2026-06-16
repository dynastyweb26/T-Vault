"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { isOnline } from "@/lib/offline/queue";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justOnline, setJustOnline] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      if (offline) {
        setJustOnline(true);
        setTimeout(() => setJustOnline(false), 2000);
      }
      setOffline(false);
    };

    setOffline(!isOnline());
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [offline]);

  if (justOnline) {
    return (
      <div
        className="tv-online-flash px-5 py-2 text-center text-[16px] font-medium text-[var(--color-success-text)]"
        role="status"
      >
        Back online
      </div>
    );
  }

  if (!offline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 bg-[var(--color-warning-bg)] px-5 py-2 text-[16px] text-[var(--color-warning-text)]"
      role="status"
    >
      <WifiOff className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      <span>You&apos;re offline — some features may be limited</span>
    </div>
  );
}
