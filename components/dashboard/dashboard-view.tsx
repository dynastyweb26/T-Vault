"use client";

import { useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { EarningsHero } from "@/components/dashboard/earnings-hero";
import { StatCards } from "@/components/dashboard/stat-cards";
import { MoneyOutRow } from "@/components/dashboard/money-out-row";
import { ActiveLoadsList } from "@/components/dashboard/active-loads-list";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AwaitingPayment } from "@/components/dashboard/awaiting-payment";
import {
  QuickExpenseRow,
  QuickExpenseSheet,
} from "@/components/dashboard/quick-expense-sheet";
import { DashboardFab } from "@/components/dashboard/dashboard-fab";
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
      <AppHeader
        title="Dashboard"
        subtitle="Your money command center"
        showDataProtection
      />

      <div
        ref={containerRef}
        {...handlers}
        className="relative mt-4 flex flex-col gap-4"
      >
        {pullDistance > 0 || refreshing ? (
          <p className="text-center text-[13px] text-[var(--color-text-muted)]">
            {refreshing ? "Refreshing..." : "Pull to refresh"}
          </p>
        ) : null}

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <p className="text-[15px] text-[var(--color-danger-text)]">{error}</p>
        ) : data ? (
          <>
            <EarningsHero data={data} />
            <StatCards data={data} />
            <MoneyOutRow data={data} />
            <NeedsAttention items={data.attentionItems} />
            <AwaitingPayment items={data.awaitingPayments} />
            <ActiveLoadsList jobs={data.activeJobs} onRefresh={refresh} />
            <QuickExpenseRow onOpen={() => setExpenseOpen(true)} />
          </>
        ) : null}
      </div>

      <DashboardFab />
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
