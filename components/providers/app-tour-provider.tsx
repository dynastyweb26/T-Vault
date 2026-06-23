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
import { TourDeadlockFallback } from "@/components/tour/tour-deadlock-fallback";
import { useNewJobSheet } from "@/components/providers/new-job-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import {
  TOUR_STEP_CONTENT,
  TOUR_FORCE_BOTTOM_FROM_INDEX,
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
import {
  buildTourFloatingOptions,
  buildTourForceBottomFloatingOptions,
} from "@/lib/tour/floating-options";
import {
  TOUR_DEADLOCK_TIMEOUT_MS,
  computeTourFallbackPosition,
  isJoyrideTooltipVisible,
  logTourDeadlockError,
} from "@/lib/tour/deadlock-escape";
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

interface DeadlockFallbackState {
  index: number;
  targetId: TourTargetId;
  content: string;
}

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
  const { closeSheet } = useNewJobSheet();
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
  const joyrideControlsRef = useRef<Controls | null>(null);
  const deadlockTimerRef = useRef<number | null>(null);
  const [deadlockFallback, setDeadlockFallback] =
    useState<DeadlockFallbackState | null>(null);

  const clearDeadlockTimer = useCallback(() => {
    if (deadlockTimerRef.current !== null) {
      window.clearTimeout(deadlockTimerRef.current);
      deadlockTimerRef.current = null;
    }
  }, []);

  const clearDeadlockFallback = useCallback(() => {
    clearDeadlockTimer();
    setDeadlockFallback(null);
  }, [clearDeadlockTimer]);

  const scheduleDeadlockEscape = useCallback(
    (stepIndex: number, targetId: TourTargetId) => {
      clearDeadlockTimer();

      deadlockTimerRef.current = window.setTimeout(() => {
        deadlockTimerRef.current = null;
        if (!run) return;
        if (isJoyrideTooltipVisible(stepIndex)) return;

        logTourDeadlockError(stepIndex, targetId);
        setDeadlockFallback({
          index: stepIndex,
          targetId,
          content: TOUR_STEP_CONTENT[stepIndex]?.content ?? "",
        });
      }, TOUR_DEADLOCK_TIMEOUT_MS);
    },
    [clearDeadlockTimer, run]
  );

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
      clearDeadlockTimer();
    };
  }, [clearDeadlockTimer]);

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
      clearDeadlockFallback();
      closeSheet();
      setJoyrideKey((current) => current + 1);

      if (options?.suppressFabForSession && user?.id) {
        suppressTourFabForSession(user.id);
        setFabSuppressedForSession(true);
      }

      beginFabCooldown();
    },
    [beginFabCooldown, clearDeadlockFallback, closeSheet, user?.id]
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
      "job-folder-details": goJobFolder,
      "job-folder-detention": goJobFolder,
      "expenses-summary": goExpenses,
      "expenses-row": goExpenses,
      "add-expense-form": goExpensesWithSheet,
      "tax-summary-overview": goTaxSummary,
      "profile-settings": goProfile,
      "profile-invite": goProfile,
    };

    return TOUR_STEP_CONTENT.map((step, index) => ({
      target: tourSelector(step.target),
      content: step.content,
      placement:
        index >= TOUR_FORCE_BOTTOM_FROM_INDEX
          ? "bottom"
          : (step.placement ?? "auto"),
      disableBeacon: true,
      spotlightClicks: false,
      ...(index >= TOUR_FORCE_BOTTOM_FROM_INDEX
        ? { floatingOptions: buildTourForceBottomFloatingOptions() }
        : {}),
      before: buildBeforeHook(
        prepareByTarget[step.target] ?? goDashboard,
        step.target
      ),
    }));
  }, [closeSheet, router]);

  const handleEvent = useCallback(
    (data: EventData, controls: Controls) => {
      joyrideControlsRef.current = controls;

      if (data.type === EVENTS.STEP_BEFORE) {
        const targetId = TOUR_STEP_CONTENT[data.index]?.target;
        if (targetId) {
          scheduleDeadlockEscape(data.index, targetId);
        }
      }

      if (data.type === EVENTS.TOOLTIP && typeof data.step.target === "string") {
        clearDeadlockFallback();
        scheduleCoVisibilityCheck(data.index, data.step.target);
      }

      const shouldStop =
        data.type === EVENTS.TOUR_END ||
        data.status === STATUS.FINISHED ||
        data.status === STATUS.SKIPPED ||
        data.action === ACTIONS.SKIP ||
        data.action === ACTIONS.CLOSE ||
        data.action === ACTIONS.STOP;

      if (shouldStop) {
        clearDeadlockFallback();
      }

      if (!shouldStop) return;

      const suppressFabForSession =
        data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;

      controls.reset(false);
      stopTour({ suppressFabForSession });
    },
    [clearDeadlockFallback, scheduleDeadlockEscape, stopTour]
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
      {deadlockFallback && joyrideControlsRef.current ? (
        <TourDeadlockFallback
          index={deadlockFallback.index}
          targetId={deadlockFallback.targetId}
          content={deadlockFallback.content}
          position={computeTourFallbackPosition(deadlockFallback.targetId)}
          isLastStep={deadlockFallback.index + 1 === TOUR_STEP_CONTENT.length}
          controls={joyrideControlsRef.current}
          onDismiss={clearDeadlockFallback}
        />
      ) : null}
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
