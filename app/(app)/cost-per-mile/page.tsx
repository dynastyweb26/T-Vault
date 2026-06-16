"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchCostPerMileData } from "@/lib/cost-per-mile/queries";
import type { CostPerMileData } from "@/lib/cost-per-mile/calculations";
import {
  CostPerMileWeekCard,
  CostPerMileTrendChart,
  CostPerMileBreakdown,
  LoadComparisonTable,
  FuelEfficiencyNote,
} from "@/components/cost-per-mile/cost-per-mile-view";

export default function CostPerMilePage() {
  const { user } = useAuth();
  const [data, setData] = useState<CostPerMileData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const result = await fetchCostPerMileData(supabase, user.id);
    setData(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AppHeader
        title="Cost Per Mile"
        subtitle="Your profitability by the mile"
      />

      {loading || !data ? (
        <div className="tv-skeleton mx-5 mt-6 h-64 rounded-2xl" />
      ) : (
        <div className="flex flex-col gap-4 px-5">
          <CostPerMileWeekCard data={data.thisWeek} />
          <CostPerMileTrendChart weeks={data.weeklyTrend} />
          <CostPerMileBreakdown
            thisMonth={data.thisMonth}
            lastMonth={data.lastMonth}
          />
          <LoadComparisonTable loads={data.loadComparison} />
          <FuelEfficiencyNote
            fuelCostPerMile={data.fuelCostPerMile}
            fuelReceiptCount={data.fuelReceiptCount}
          />
        </div>
      )}
    </>
  );
}
