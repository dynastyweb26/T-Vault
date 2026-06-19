"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { APP_ROUTES } from "@/lib/constants";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [progress, setProgress] = useState<Array<{ step: string; ok: boolean }>>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirm !== "DELETE") return;
    setLoading(true);
    setError(null);

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });

    if (!response.ok) {
      setError("Account deletion failed. Please try again or contact support.");
      setLoading(false);
      return;
    }

    const result = await response.json();
    const steps = (result.progress ?? []) as Array<{ step: string; ok: boolean }>;
    setProgress(steps);

    if (result.partialFailure || steps.some((step) => !step.ok)) {
      setError(
        "We hit an issue deleting some of your data. Your account has not been deleted yet — please try again or contact support."
      );
      setLoading(false);
      return;
    }

    router.push(APP_ROUTES.splash);
  };

  return (
    <>
      <AppHeader title="Delete Account" subtitle="This cannot be undone" />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        <p className="tv-body text-[16px] text-[var(--color-danger-text)]">
          All your loads, documents, expenses, and files will be permanently
          removed.
        </p>

        <TvInput
          label='Type DELETE to confirm'
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {progress.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {progress.map((p) => (
              <li
                key={p.step}
                className={`text-[15px] ${p.ok ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}`}
              >
                {p.step}: {p.ok ? "done" : "failed"}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="tv-error-state text-[15px]">{error}</p> : null}

        <TvButton
          disabled={confirm !== "DELETE" || loading}
          onClick={handleDelete}
          className="bg-[var(--color-danger)] text-[var(--color-danger-text)]"
        >
          {loading ? "Deleting..." : "Delete Account"}
        </TvButton>

        <TvButton variant="secondary" onClick={() => router.back()}>
          Cancel
        </TvButton>
      </div>
    </>
  );
}
