"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { AuthBrandHeader } from "@/components/shell/auth-brand-header";
import { createClient } from "@/lib/supabase/client";
import { APP_ROUTES } from "@/lib/constants";
import { FIELD_LIMITS } from "@/lib/validation";
import {
  getPasswordStrength,
  getTextCounter,
  sanitizeText,
  validateEmail,
  validatePassword,
  validateReferralCode,
  validateTextLength,
} from "@/lib/validation";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
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

  const validateForm = () => {
    const nextErrors = {
      fullName: validateTextLength(
        fullName,
        FIELD_LIMITS.fullName,
        "Full name"
      ),
      email: validateEmail(email),
      password: validatePassword(password),
      referralCode: validateReferralCode(referralCode),
    };
    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const handleSignUp = async () => {
    setFormError(null);
    if (!validateForm()) return;

    setLoading(true);
    const cleanedName = sanitizeText(fullName);
    const cleanedReferral = referralCode.trim().toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: cleanedName,
          referred_by: cleanedReferral || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);

    if (error) {
      setFormError(
        "We could not create your account. Check your details and try again."
      );
      return;
    }

    if (data.user) {
      await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanedName,
          referredBy: cleanedReferral,
        }),
      });

      if (!data.session) {
        setConfirmationSent(true);
        return;
      }

      router.replace(APP_ROUTES.onboarding);
    }
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setFormError(
        "Google sign-up did not start. Check your connection and try again."
      );
    }
  };

  if (confirmationSent) {
    return (
      <div className="tv-auth-page justify-center">
        <AuthBrandHeader />
        <h1 className="tv-page-title">Check your email</h1>
        <p className="mt-3 text-[17px] text-[var(--color-text-secondary)]">
          We sent a confirmation link to {email}. Open it on this phone to
          finish creating your T-Vault account.
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
        <p className="tv-caption">Start protecting your money</p>
        <h1 className="tv-page-title mt-1">Create account</h1>
        <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
          Big buttons. Simple setup. Built for life in the cab.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <TvInput
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={errors.fullName}
          counter={getTextCounter(fullName, FIELD_LIMITS.fullName)}
        />
        <TvInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <div>
          <TvInput
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            helper="Use at least 8 characters. Fair passwords are allowed."
          />
          {password ? (
            <p
              className="mt-2 text-[14px]"
              style={{ color: strengthColor }}
            >
              Password strength: {strengthLabel}
            </p>
          ) : null}
        </div>
        <TvInput
          label="Referral code (optional)"
          value={referralCode}
          onChange={(event) =>
            setReferralCode(event.target.value.toUpperCase())
          }
          error={errors.referralCode}
          helper="Format: TVT-ABC-1234"
        />

        {formError ? (
          <p className="text-[14px] text-[var(--color-danger-text)]">{formError}</p>
        ) : null}

        <TvButton loading={loading} onClick={handleSignUp}>
          Create account
        </TvButton>

        <TvButton variant="secondary" onClick={handleGoogleSignUp}>
          Continue with Google
        </TvButton>

        <p className="pt-2 text-center text-[16px] text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link
            href={APP_ROUTES.signIn}
            className="tv-link font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
