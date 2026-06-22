"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrokerDirectoryView } from "@/components/brokers/broker-directory-view";
import { useAuth } from "@/components/providers/auth-provider";
import { useProPaywall } from "@/components/pro/pro-paywall-provider";
import { APP_ROUTES } from "@/lib/constants";

export default function FindBrokerPage() {
  const router = useRouter();
  const { hasProAccess, loading } = useAuth();
  const { openPaywall } = useProPaywall();

  useEffect(() => {
    if (loading || hasProAccess) return;

    openPaywall({
      variant: "generic",
      headline: "Pro required",
      subheadline: "Search brokers nationwide",
    });
    router.replace(APP_ROUTES.dashboard);
  }, [hasProAccess, loading, openPaywall, router]);

  if (loading || !hasProAccess) {
    return null;
  }

  return <BrokerDirectoryView />;
}
