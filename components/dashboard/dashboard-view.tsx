"use client";

import { useState } from "react";
import { DataProtectionBanner } from "@/components/shell/session-banner";
import { EarningsHero } from "@/components/dashboard/earnings-hero";
import { MoneyOutRow } from "@/components/dashboard/money-out-row";
import { ActiveLoadsList } from "@/components/dashboard/active-loads-list";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AwaitingPayment } from "@/components/dashboard/awaiting-payment";
import {
  QuickExpenseRow,
  QuickExpenseSheet,
} from "@/components/dashboard/quick-expense-sheet";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { SuccessBanner } from "@/components/dashboard/success-banner";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export function DashboardView() {
  const { data, loading, refreshing, error, refresh } = useDashboardData();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { containerRef, pullDistance, handlers } = usePullToRefresh(async () => {
    await refresh();
  });

  return (
    <>
      <QuickActions />

      <div
        ref={containerRef}
        {...handlers}
        className="relative flex flex-col"
      >
        {pullDistance > 0 || refreshing ? (
          <p className="px-5 py-2 text-center text-[13px] text-[var(--color-text-muted)]">
            {refreshing ? "Refreshing..." : "Pull to refresh"}
          </p>
        ) : null}

        <div className="px-5 pb-2">
          <DataProtectionBanner />
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="tv-error-state mx-5">
            <p className="tv-body text-[15px]">{error}</p>
          </div>
        ) : data ? (
          <>
            <EarningsHero data={data} />
            <MoneyOutRow data={data} />
            <div className="flex flex-col gap-6 px-5">
              <NeedsAttention items={data.attentionItems} />
              <AwaitingPayment items={data.awaitingPayments} />
              <ActiveLoadsList jobs={data.activeJobs} onRefresh={refresh} />
              <QuickExpenseRow onOpen={() => setExpenseOpen(true)} />
            </div>
          </>
        ) : null}
      </div>

      <QuickExpenseSheet
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSaved={setSuccessMessage}
      />
      <SuccessBanner
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
    </>
  );
}
