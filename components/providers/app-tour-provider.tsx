"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Joyride,
  EVENTS,
  STATUS,
  ACTIONS,
  type Controls,
  type EventData,
  type FloatingOptions,
  type Step,
} from "react-joyride";
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
import { wait, waitForElement } from "@/lib/tour/navigation";
import { setTourAborted, isTourAborted, TourAbortedError } from "@/lib/tour/abort";
import {
  isTourFabSuppressedForSession,
  suppressTourFabForSession,
  TOUR_FAB_COOLDOWN_MS,
} from "@/lib/tour/fab-session";
import { buildTourFloatingOptions } from "@/lib/tour/floating-options";
import { warnIfTourStepNotCoVisible } from "@/lib/tour/co-visibility";

export type TourPhase = "idle" | "starting" | "running";

interface StopTourOptions {
  suppressFabForSession?: boolean;
}

interface AppTourContextValue {
  isRunning: boolean;
  tourPhase: TourPhase;
  fabSuppressedForSession: boolean;
  sampleJobId: string | null;
  expenseSheetOpen: boolean;
  startTour: () => Promise<void>;
  stopTour: (options?: StopTourOptions) => void;
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
    try {
      await prepare();
      // Mount/wait only — Joyride owns scroll-to-target before the tooltip shows.
      await waitForElement(target, 10000);
    } catch (error) {
      if (error instanceof TourAbortedError) {
        return;
      }
      throw error;
    }
  };
}

function scheduleCoVisibilityCheck(stepIndex: number, targetSelector: string) {
  if (process.env.NODE_ENV === "production") return;

  const targetId =
    TOUR_STEP_CONTENT[stepIndex]?.target ?? `unknown-step-${stepIndex}`;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      warnIfTourStepNotCoVisible(stepIndex, targetSelector, targetId);
    });
  });
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { openSheet, closeSheet } = useNewJobSheet();
  const [run, setRun] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(0);
  const [tourPhase, setTourPhase] = useState<TourPhase>("idle");
  const [fabSuppressedForSession, setFabSuppressedForSession] = useState(false);
  const [sampleJobId, setSampleJobId] = useState<string | null>(null);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const sampleJobIdRef = useRef<string | null>(null);
  const fabCooldownRef = useRef<number | null>(null);
  const [floatingOptions, setFloatingOptions] = useState<
    Partial<FloatingOptions>
  >(() => buildTourFloatingOptions());

  useEffect(() => {
    const syncFloatingPadding = () => {
      setFloatingOptions(buildTourFloatingOptions());
    };

    syncFloatingPadding();
    window.addEventListener("resize", syncFloatingPadding);
    window.addEventListener("orientationchange", syncFloatingPadding);
    window.visualViewport?.addEventListener("resize", syncFloatingPadding);

    return () => {
      window.removeEventListener("resize", syncFloatingPadding);
      window.removeEventListener("orientationchange", syncFloatingPadding);
      window.visualViewport?.removeEventListener("resize", syncFloatingPadding);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFabSuppressedForSession(false);
      return;
    }
    setFabSuppressedForSession(isTourFabSuppressedForSession(user.id));
  }, [user]);

  useEffect(() => {
    return () => {
      if (fabCooldownRef.current) {
        window.clearTimeout(fabCooldownRef.current);
      }
    };
  }, []);

  const beginFabCooldown = useCallback(() => {
    setTourPhase("starting");

    if (fabCooldownRef.current) {
      window.clearTimeout(fabCooldownRef.current);
    }

    fabCooldownRef.current = window.setTimeout(() => {
      fabCooldownRef.current = null;
      setTourPhase("idle");
    }, TOUR_FAB_COOLDOWN_MS);
  }, []);

  const stopTour = useCallback(
    (options?: StopTourOptions) => {
      setTourAborted(true);
      setRun(false);
      setExpenseSheetOpen(false);
      closeSheet();
      setJoyrideKey((current) => current + 1);

      if (options?.suppressFabForSession && user?.id) {
        suppressTourFabForSession(user.id);
        setFabSuppressedForSession(true);
      }

      beginFabCooldown();
    },
    [beginFabCooldown, closeSheet, user?.id]
  );

  const startTour = useCallback(async () => {
    if (!user) return;

    setTourAborted(false);
    setTourPhase("starting");

    const jobId = await fetchSampleJobId(user.id);
    sampleJobIdRef.current = jobId;
    setSampleJobId(jobId);
    setExpenseSheetOpen(false);
    closeSheet();
    router.push(APP_ROUTES.dashboard);

    try {
      await wait(300);
    } catch (error) {
      if (error instanceof TourAbortedError) {
        setTourPhase("idle");
        return;
      }
      throw error;
    }

    if (isTourAborted()) {
      setTourPhase("idle");
      return;
    }

    setTourPhase("running");
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
    (data: EventData, controls: Controls) => {
      if (data.type === EVENTS.TOOLTIP && typeof data.step.target === "string") {
        scheduleCoVisibilityCheck(data.index, data.step.target);
      }

      const shouldStop =
        data.type === EVENTS.TOUR_END ||
        data.status === STATUS.FINISHED ||
        data.status === STATUS.SKIPPED ||
        data.action === ACTIONS.SKIP ||
        data.action === ACTIONS.CLOSE ||
        data.action === ACTIONS.STOP;

      if (!shouldStop) return;

      const suppressFabForSession =
        data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;

      controls.reset(false);
      stopTour({ suppressFabForSession });
    },
    [stopTour]
  );

  const value = useMemo(
    () => ({
      isRunning: run,
      tourPhase,
      fabSuppressedForSession,
      sampleJobId,
      expenseSheetOpen,
      startTour,
      stopTour,
    }),
    [
      expenseSheetOpen,
      fabSuppressedForSession,
      run,
      sampleJobId,
      startTour,
      stopTour,
      tourPhase,
    ]
  );

  return (
    <AppTourContext.Provider value={value}>
      {children}
      <Joyride
        key={joyrideKey}
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        tooltipComponent={TourTooltip}
        floatingOptions={floatingOptions}
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
