"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@/components/providers/auth-provider";

const POSTHOG_PROXY_PATH = "/ph-events";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_ENABLED = Boolean(POSTHOG_KEY);

if (typeof window !== "undefined" && POSTHOG_KEY && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: "https://us.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    capture_exceptions: true,
    loaded: () => {
      console.error("[TEMP DEBUG exception] loaded callback", {
        capture_exceptions: posthog.config?.capture_exceptions,
        hasExceptionObserver: Boolean(posthog.exceptionObserver),
        exceptionObserverEnabled: posthog.exceptionObserver?.isEnabled,
      });
    },
  });

  console.error("[TEMP DEBUG exception] post-init sync", {
    __loaded: posthog.__loaded,
    capture_exceptions: posthog.config?.capture_exceptions,
    hasExceptionObserver: Boolean(posthog.exceptionObserver),
    exceptionObserverEnabled: posthog.exceptionObserver?.isEnabled,
  });
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    let url = window.origin + pathname;
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`;
    }

    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { user, profile } = useAuth();
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (user && identifiedId.current !== user.id) {
      identifiedId.current = user.id;
      posthog.identify(user.id, {
        email: user.email,
        name: profile?.full_name ?? undefined,
      });
    } else if (!user && identifiedId.current) {
      identifiedId.current = null;
      posthog.reset();
    }
  }, [user, profile]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_ENABLED) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
