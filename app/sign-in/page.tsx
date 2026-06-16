"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { getPostAuthRedirect } from "@/lib/auth-helpers";
import { validateEmail } from "@/lib/validation";
import type { UserProfile } from "@/types/database";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      router.replace(getPostAuthRedirect(profile as UserProfile | null));
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
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
        <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
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
          <p className="text-[14px] text-[var(--color-danger-text)]">{formError}</p>
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
