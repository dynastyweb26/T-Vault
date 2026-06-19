"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { validateEmail } from "@/lib/validation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_failed"
      ? "Sign-in could not be completed. Try again."
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setPasswordError(
      password ? null : "Enter your password so we can sign you in."
    );
    setFormError(null);

    if (nextEmailError || !password) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setFormError(
        "We could not sign you in. Check your email and password, then try again."
      );
      return;
    }

    if (data.user) {
      router.replace(APP_ROUTES.splash);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/splash`,
      },
    });

    if (error) {
      setFormError(
        "Google sign-in did not start. Check your connection and try again."
      );
    }
  };

  return (
    <div className="tv-auth-page justify-center">
      <AuthBrandHeader />
      <div className="mb-8">
        <p className="tv-caption">Welcome back</p>
        <h1 className="tv-page-title mt-1">Sign in</h1>
        <p className="tv-body mt-2 text-[var(--color-text-secondary)]">
          Get back to your loads, invoices, and money.
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
        <TvInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
        />

        {formError ? (
          <div className="tv-error-state px-4 py-3">
            <p className="text-[14px]">{formError}</p>
          </div>
        ) : null}

        <TvButton loading={loading} onClick={handleSignIn}>
          Sign in
        </TvButton>

        <TvButton variant="secondary" onClick={handleGoogleSignIn}>
          Continue with Google
        </TvButton>

        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <Link
            href={APP_ROUTES.forgotPassword}
            className="tv-link text-[16px]"
          >
            Forgot password?
          </Link>
          <p className="text-[16px] text-[var(--color-text-secondary)]">
            New here?{" "}
            <Link
              href={APP_ROUTES.signUp}
              className="tv-link font-medium"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
