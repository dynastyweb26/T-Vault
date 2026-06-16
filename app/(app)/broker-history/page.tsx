"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { BrokerHistoryView } from "@/components/broker-history/broker-history-view";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchBrokerHistory,
  type BrokerHistoryEntry,
} from "@/lib/broker-history/queries";

export default function BrokerHistoryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BrokerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const result = await fetchBrokerHistory(supabase, user.id);
    setEntries(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AppHeader
        title="Broker History"
        subtitle="Your private record. Never shared."
      />
      <BrokerHistoryView entries={entries} loading={loading} />
    </>
  );
}
