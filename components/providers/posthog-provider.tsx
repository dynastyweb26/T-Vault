"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@/components/providers/auth-provider";

const POSTHOG_PROXY_PATH = "/ph-events";

function logPostHogDebugState(label: string) {
  console.error(`[TEMP DEBUG posthog] ${label}`, {
    __loaded: posthog.__loaded,
    api_host: posthog.config?.api_host,
    has_opted_out_capturing: posthog.has_opted_out_capturing?.(),
    distinct_id: posthog.get_distinct_id?.(),
  });
}

function PostHogPageView() {
  console.error("[TEMP DEBUG posthog] PostHogPageView mount");

  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      console.error(
        "[TEMP DEBUG posthog] PostHogPageView skipped capture — no pathname",
      );
      return;
    }

    let url = window.origin + pathname;
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`;
    }

    console.error("[TEMP DEBUG posthog] capturing pageview for:", pathname, {
      url,
    });

    logPostHogDebugState("pre-capture");

    try {
      posthog.capture("$pageview", { $current_url: url });
      console.error(
        "[TEMP DEBUG posthog] capture call completed for:",
        pathname,
      );
      logPostHogDebugState("post-capture");

      try {
        posthog.flush();
        console.error(
          "[TEMP DEBUG posthog] posthog.flush() called after pageview capture",
        );
      } catch (flushError) {
        console.error(
          "[TEMP DEBUG posthog] posthog.flush() failed after pageview capture:",
          flushError,
        );
      }
    } catch (error) {
      console.error(
        "[TEMP DEBUG posthog] capture call failed for:",
        pathname,
        error,
      );
    }
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
  console.error(
    "[TEMP DEBUG posthog] raw key value:",
    process.env.NEXT_PUBLIC_POSTHOG_KEY,
    "type:",
    typeof process.env.NEXT_PUBLIC_POSTHOG_KEY,
  );

  const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  console.error("[TEMP DEBUG posthog] enabled:", enabled);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    console.error(
      "[TEMP DEBUG posthog] useEffect key before guard:",
      key,
      "type:",
      typeof key,
    );
    if (!key) return;

    try {
      posthog.init(key, {
        api_host: POSTHOG_PROXY_PATH,
        ui_host: "https://us.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
        person_profiles: "identified_only",
        before_send: (event) => {
          console.error("[TEMP DEBUG posthog] before_send:", event?.event, {
            api_host: posthog.config?.api_host,
            __loaded: posthog.__loaded,
          });
          return event;
        },
        loaded: (client) => {
          console.error("[TEMP DEBUG posthog] loaded callback fired", {
            __loaded: client.__loaded,
            api_host: client.config?.api_host,
            distinct_id: client.get_distinct_id?.(),
          });
        },
      });
      console.error("[TEMP DEBUG posthog] posthog.init() succeeded");
      logPostHogDebugState("post-init sync");
    } catch (error) {
      console.error("[TEMP DEBUG posthog] posthog.init() failed:", error);
    }
  }, []);

  if (!enabled) {
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
