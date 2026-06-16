"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_ROUTES } from "@/lib/constants";
import {
  FIELD_LIMITS,
  formatDotNumber,
  formatMcNumber,
  getTextCounter,
  sanitizeText,
  validateDotNumber,
  validateMcNumber,
  validateTextLength,
} from "@/lib/validation";

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [companyName, setCompanyName] = useState(profile?.company_name ?? "");
  const [mcNumber, setMcNumber] = useState(profile?.mc_number ?? "");
  const [dotNumber, setDotNumber] = useState(profile?.dot_number ?? "");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {
      fullName: validateTextLength(
        fullName,
        FIELD_LIMITS.fullName,
        "Full name"
      ),
      companyName: validateTextLength(
        companyName,
        FIELD_LIMITS.company,
        "Company name"
      ),
      mcNumber: validateMcNumber(mcNumber),
      dotNumber: validateDotNumber(dotNumber),
    };
    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const saveProfile = async (skipped = false) => {
    if (!user) {
      router.replace(APP_ROUTES.signIn);
      return;
    }

    if (!skipped && !validate()) return;

    setLoading(true);
    const payload = skipped
      ? {
          profile_setup_skipped: true,
          profile_setup_completed: true,
        }
      : {
          full_name: sanitizeText(fullName),
          company_name: sanitizeText(companyName),
          mc_number: formatMcNumber(mcNumber),
          dot_number: formatDotNumber(dotNumber),
          profile_setup_completed: true,
          profile_setup_skipped: false,
        };

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);
    setLoading(false);

    if (error) {
      setFormError(
        "We could not save your profile. Check your connection and try again."
      );
      return;
    }

    await refreshProfile();
    router.replace(APP_ROUTES.dashboard);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8">
      <div className="mb-8">
        <p className="tv-caption">One-time setup</p>
        <h1 className="tv-page-title mt-1">Profile setup</h1>
        <p className="mt-2 text-[17px] text-[var(--color-text-secondary)]">
          Add your authority numbers so invoices and documents are ready when
          you need them.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <TvInput
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() =>
            setFullName((value) => sanitizeText(value))
          }
          error={errors.fullName}
          counter={getTextCounter(fullName, FIELD_LIMITS.fullName)}
        />
        <TvInput
          label="Company name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          onBlur={() =>
            setCompanyName((value) => sanitizeText(value))
          }
          error={errors.companyName}
          counter={getTextCounter(companyName, FIELD_LIMITS.company)}
        />
        <TvInput
          label="MC Number"
          value={mcNumber}
          onChange={(event) =>
            setMcNumber(formatMcNumber(event.target.value))
          }
          error={errors.mcNumber}
          helper="Format: MC-123456 or MC-1234567"
        />
        <TvInput
          label="DOT Number"
          value={dotNumber}
          onChange={(event) =>
            setDotNumber(formatDotNumber(event.target.value))
          }
          error={errors.dotNumber}
          helper="Format: DOT-1234567"
        />

        {formError ? (
          <p className="text-[14px] text-[var(--color-danger-text)]">{formError}</p>
        ) : null}

        <TvButton loading={loading} onClick={() => saveProfile(false)}>
          Save profile
        </TvButton>
        <TvButton variant="ghost" onClick={() => saveProfile(true)}>
          Skip for now
        </TvButton>
      </div>
    </div>
  );
}
