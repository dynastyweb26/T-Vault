"use client";

import Link from "next/link";
import { useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { validateEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(null);
    if (nextEmailError) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/sign-in`,
    });
    setLoading(false);

    if (error) {
      setFormError(
        "We could not send the reset email. Check the address and try again."
      );
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="tv-auth-page justify-center">
        <AuthBrandHeader />
        <h1 className="tv-page-title">Reset link sent</h1>
        <p className="mt-3 text-[17px] text-[var(--color-text-secondary)]">
          Check {email} for a password reset link. Open it on this phone to get
          back into T-Vault.
        </p>
        <Link
          href={APP_ROUTES.signIn}
          className="tv-link mt-8 text-[16px] font-medium"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="tv-auth-page justify-center">
      <AuthBrandHeader />
      <div className="mb-8">
        <p className="tv-caption">Account recovery</p>
        <h1 className="tv-page-title mt-1">Forgot password</h1>
        <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
          Enter your email and we will send a reset link.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <TvInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />

        {formError ? (
          <p className="text-[14px] text-[var(--color-danger-text)]">{formError}</p>
        ) : null}

        <TvButton loading={loading} onClick={handleReset}>
          Send reset link
        </TvButton>

        <Link
          href={APP_ROUTES.signIn}
          className="tv-link text-center text-[16px]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
