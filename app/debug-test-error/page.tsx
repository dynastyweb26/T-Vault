"use client";

import { useEffect } from "react";

function throwDeferredError(message: string) {
  window.setTimeout(() => {
    throw new Error(message);
  }, 0);
}

export default function DebugTestErrorPage() {
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      JSON.parse("not valid json");
    }, 500);

    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">PostHog exception test</h1>
      <p className="text-sm text-[var(--color-muted)]">
        TEMPORARY debug page. On load, this throws a deferred{" "}
        <code>JSON.parse</code> error from application code (not the DevTools
        console). Remove after verifying PostHog Error Tracking.
      </p>
      <button
        type="button"
        className="rounded-xl bg-[var(--color-danger)] px-4 py-3 text-sm font-medium text-white"
        onClick={() => throwDeferredError("posthog manual application test error")}
      >
        Throw deferred application error
      </button>
      <button
        type="button"
        className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-medium"
        onClick={() => {
          void Promise.reject(new Error("posthog unhandled rejection test"));
        }}
      >
        Trigger unhandled promise rejection
      </button>
    </main>
  );
}
