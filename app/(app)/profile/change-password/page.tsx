"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getPasswordStrength,
  validatePassword,
} from "@/lib/validation";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword]
  );

  const strengthLabel = {
    weak: "Weak",
    fair: "Fair",
    strong: "Strong",
  }[passwordStrength];

  const strengthColor = {
    weak: "var(--color-danger-text)",
    fair: "var(--color-warning-text)",
    strong: "var(--color-success-text)",
  }[passwordStrength];

  const handleSubmit = async () => {
    const nextCurrentError = currentPassword
      ? null
      : "Enter your current password.";
    const nextNewError = validatePassword(newPassword);
    const nextConfirmError =
      confirmPassword !== newPassword ? "Passwords do not match." : null;

    setCurrentError(nextCurrentError);
    setNewError(nextNewError);
    setConfirmError(nextConfirmError);
    setFormError(null);
    setSaved(false);

    if (nextCurrentError || nextNewError || nextConfirmError || !user) return;

    setLoading(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setLoading(false);

    if (response.status === 429) {
      setFormError("Too many attempts. Please wait and try again.");
      return;
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFormError(data?.error || "Could not update password. Try again.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
  };

  return (
    <>
      <AppHeader title="Change Password" />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        <p className="tv-body text-[16px] text-[var(--color-text-secondary)]">
          Confirm your current password, then choose a new one.
        </p>

        <TvInput
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={currentError}
        />
        <TvInput
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          error={newError}
        />
        {newPassword ? (
          <p className="-mt-2 text-[13px]" style={{ color: strengthColor }}>
            Strength: {strengthLabel}
          </p>
        ) : null}
        <TvInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={confirmError}
        />

        {formError ? (
          <div className="tv-error-state px-4 py-3">
            <p className="text-[14px]">{formError}</p>
          </div>
        ) : null}

        {saved ? (
          <p className="text-[14px] text-[var(--color-success-text)]">
            Password updated.
          </p>
        ) : null}

        <TvButton loading={loading} onClick={handleSubmit}>
          Update password
        </TvButton>
      </div>
    </>
  );
}
