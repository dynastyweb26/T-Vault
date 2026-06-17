"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Joyride, EVENTS, STATUS, type EventData, type Step } from "react-joyride";
import { TourTooltip } from "@/components/tour/tour-tooltip";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import {
  TOUR_STEP_CONTENT,
  tourSelector,
  type TourTargetId,
} from "@/lib/tour/constants";
import { scrollTargetIntoView, wait, waitForElement } from "@/lib/tour/navigation";

interface AppTourContextValue {
  isRunning: boolean;
  sampleJobId: string | null;
  expenseSheetOpen: boolean;
  startTour: () => Promise<void>;
  stopTour: () => void;
}

const AppTourContext = createContext<AppTourContextValue | undefined>(undefined);

async function fetchSampleJobId(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_template", false)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

function buildBeforeHook(
  prepare: () => Promise<void>,
  target: TourTargetId
): () => Promise<void> {
  return async () => {
    await prepare();
    await waitForElement(target, 10000);
    await scrollTargetIntoView(target);
  };
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { openSheet, closeSheet } = useNewJobSheet();
  const [run, setRun] = useState(false);
  const [sampleJobId, setSampleJobId] = useState<string | null>(null);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const sampleJobIdRef = useRef<string | null>(null);

  const stopTour = useCallback(() => {
    setRun(false);
    setExpenseSheetOpen(false);
    closeSheet();
  }, [closeSheet]);

  const startTour = useCallback(async () => {
    if (!user) return;

    const jobId = await fetchSampleJobId(user.id);
    sampleJobIdRef.current = jobId;
    setSampleJobId(jobId);
    setExpenseSheetOpen(false);
    closeSheet();
    router.push(APP_ROUTES.dashboard);
    await wait(300);
    setRun(true);
  }, [closeSheet, router, user]);

  const steps = useMemo<Step[]>(() => {
    const goDashboard = async () => {
      setExpenseSheetOpen(false);
      closeSheet();
      router.push(APP_ROUTES.dashboard);
      await wait(400);
    };

    const goLoads = async () => {
      setExpenseSheetOpen(false);
      closeSheet();
      router.push(APP_ROUTES.loads);
      await wait(400);
    };

    const goNewJob = async () => {
      setExpenseSheetOpen(false);
      router.push(APP_ROUTES.newJob);
      openSheet();
      await wait(450);
    };

    const goJobFolder = async () => {
      setExpenseSheetOpen(false);
      closeSheet();
      const jobId = sampleJobIdRef.current;
      if (!jobId) {
        router.push(APP_ROUTES.loads);
        await wait(400);
        return;
      }
      router.push(`${APP_ROUTES.loads}/${jobId}`);
      await wait(500);
    };

    const goExpenses = async () => {
      closeSheet();
      setExpenseSheetOpen(false);
      router.push(APP_ROUTES.expenses);
      await wait(400);
    };

    const goExpensesWithSheet = async () => {
      closeSheet();
      router.push(APP_ROUTES.expenses);
      await wait(350);
      setExpenseSheetOpen(true);
      await wait(450);
    };

    const goTaxSummary = async () => {
      setExpenseSheetOpen(false);
      closeSheet();
      router.push(APP_ROUTES.taxSummary);
      await wait(400);
    };

    const goProfile = async () => {
      setExpenseSheetOpen(false);
      closeSheet();
      router.push(APP_ROUTES.profile);
      await wait(400);
    };

    const prepareByTarget: Partial<Record<TourTargetId, () => Promise<void>>> = {
      "dashboard-revenue": goDashboard,
      "dashboard-quick-actions": goDashboard,
      "dashboard-ledger-insight": goDashboard,
      "dashboard-cost-per-mile": goDashboard,
      "dashboard-needs-attention": goDashboard,
      "loads-search-tabs": goLoads,
      "loads-job-card": goLoads,
      "new-load-form": goNewJob,
      "job-folder-details": goJobFolder,
      "job-folder-detention": goJobFolder,
      "expenses-summary": goExpenses,
      "expenses-row": goExpenses,
      "add-expense-form": goExpensesWithSheet,
      "tax-summary-overview": goTaxSummary,
      "profile-settings": goProfile,
      "profile-invite": goProfile,
    };

    return TOUR_STEP_CONTENT.map((step) => ({
      target: tourSelector(step.target),
      content: step.content,
      placement: step.placement ?? "auto",
      disableBeacon: true,
      spotlightClicks: false,
      before: buildBeforeHook(
        prepareByTarget[step.target] ?? goDashboard,
        step.target
      ),
    }));
  }, [closeSheet, openSheet, router]);

  const handleEvent = useCallback(
    (data: EventData) => {
      if (
        data.type === EVENTS.TOUR_END ||
        data.status === STATUS.FINISHED ||
        data.status === STATUS.SKIPPED
      ) {
        stopTour();
      }
    },
    [stopTour]
  );

  const value = useMemo(
    () => ({
      isRunning: run,
      sampleJobId,
      expenseSheetOpen,
      startTour,
      stopTour,
    }),
    [expenseSheetOpen, run, sampleJobId, startTour, stopTour]
  );

  return (
    <AppTourContext.Provider value={value}>
      {children}
      <Joyride
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        tooltipComponent={TourTooltip}
        onEvent={handleEvent}
        styles={{
          overlay: {
            mixBlendMode: "normal",
          },
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Done",
          next: "Next",
          skip: "Skip tour",
        }}
        options={{
          closeButtonAction: "skip",
          buttons: ["close", "primary"],
        }}
      />
    </AppTourContext.Provider>
  );
}

export function useAppTour() {
  const ctx = useContext(AppTourContext);
  if (!ctx) {
    throw new Error("useAppTour must be used within AppTourProvider");
  }
  return ctx;
}
