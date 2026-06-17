"use client";

import { useState } from "react";
import { DataProtectionBanner } from "@/components/shell/session-banner";
import { TourHintBanner } from "@/components/dashboard/tour-hint-banner";
import { EarningsHero } from "@/components/dashboard/earnings-hero";
import { MoneyOutRow } from "@/components/dashboard/money-out-row";
import { ActiveLoadsList } from "@/components/dashboard/active-loads-list";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AwaitingPayment } from "@/components/dashboard/awaiting-payment";
import {
  QuickExpenseRow,
  QuickExpenseSheet,
} from "@/components/dashboard/quick-expense-sheet";
import { StreakCard } from "@/components/dashboard/streak-card";
import { VoiceNoteShortcut } from "@/components/voice-note/voice-note-shortcut";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { VOICE_NOTES_ENABLED } from "@/lib/features";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { SuccessBanner } from "@/components/dashboard/success-banner";
import { CostPerMileDashboardCard } from "@/components/cost-per-mile/cost-per-mile-view";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export function DashboardView() {
  const { data, loading, refreshing, error, refresh } = useDashboardData();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { containerRef, contentRef, indicatorRef, refreshing: pullRefreshing, handlers } =
    usePullToRefresh(async () => {
      await refresh();
    });

  return (
    <>
      <QuickActions />

      <div className="px-5 pb-2">
        <TourHintBanner />
      </div>

      <div ref={containerRef} {...handlers} className="relative flex flex-col">
        <p
          ref={indicatorRef}
          className="tv-pull-indicator px-5 py-2 text-center text-[13px] text-[var(--color-text-muted)]"
          style={{
            display: pullRefreshing || refreshing ? "block" : undefined,
          }}
        >
          {pullRefreshing || refreshing ? "Refreshing..." : "Pull to refresh"}
        </p>

        <div ref={contentRef} className="tv-pull-content flex flex-col">

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
            <div className="px-5">
              <StreakCard streakDays={data.streakDays} />
            </div>
            <MoneyOutRow data={data} />
            <div className="px-5">
              <CostPerMileDashboardCard
                netPerMile={
                  data.totalMilesThisMonth > 0
                    ? (data.earnedThisMonth - data.expensesThisMonth) /
                      data.totalMilesThisMonth
                    : 0
                }
              />
            </div>
            <div className="flex flex-col gap-6 px-5">
              <NeedsAttention items={data.attentionItems} />
              <AwaitingPayment items={data.awaitingPayments} />
              <ActiveLoadsList jobs={data.activeJobs} onRefresh={refresh} />
              <QuickExpenseRow onOpen={() => setExpenseOpen(true)} />
              {VOICE_NOTES_ENABLED ? (
                <VoiceNoteShortcut />
              ) : null}
            </div>
          </>
        ) : null}
        </div>
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
