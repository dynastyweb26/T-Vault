"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth } from "@/components/providers/auth-provider";

const POSTHOG_PROXY_PATH = "/ph-events";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", { $current_url: url });
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
  const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host: POSTHOG_PROXY_PATH,
      ui_host: "https://us.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
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
