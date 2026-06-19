"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { TvInput } from "@/components/tv/tv-input";
import { TvTextarea } from "@/components/tv/tv-textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { TEXT_LIMITS } from "@/lib/constants";
import {
  formatMcNumber,
  getTextCounter,
  sanitizeText,
  validateMcNumber,
  validateTextLength,
} from "@/lib/validation";

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [ein, setEin] = useState("");
  const [truckInfo, setTruckInfo] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCompanyName(profile.company_name ?? "");
    setMcNumber(profile.mc_number ?? "");
    setEin(profile.ein ?? "");
    setTruckInfo(profile.truck_info ?? "");
  }, [profile]);

  const validate = () => {
    const nextErrors = {
      fullName: validateTextLength(fullName, TEXT_LIMITS.fullName, "Full name"),
      companyName: companyName.trim()
        ? validateTextLength(companyName, TEXT_LIMITS.company, "Company name")
        : null,
      mcNumber: mcNumber.trim() ? validateMcNumber(mcNumber) : null,
      truckInfo:
        truckInfo.length > TEXT_LIMITS.truckInfo
          ? `Truck info must be ${TEXT_LIMITS.truckInfo} characters or fewer.`
          : null,
    };
    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const saveProfile = async () => {
    if (!validate()) return;

    setLoading(true);
    setFormError(null);
    setSaved(false);

    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: sanitizeText(fullName),
        companyName: sanitizeText(companyName),
        mcNumber: formatMcNumber(mcNumber),
        ein: sanitizeText(ein) || null,
        truckInfo: sanitizeText(truckInfo),
      }),
    });

    setLoading(false);

    if (response.status === 429) {
      setFormError("Too many attempts. Please wait a few minutes and try again.");
      return;
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFormError(
        data?.error ||
          "We could not save your profile. Check your connection and try again."
      );
      return;
    }

    await refreshProfile();
    setSaved(true);
  };

  return (
    <>
      <AppHeader title="Edit Profile" />
      <div className="mt-6 flex flex-col gap-4 px-5 pb-8">
        <TvInput
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() => setFullName((value) => sanitizeText(value))}
          error={errors.fullName}
          counter={getTextCounter(fullName, TEXT_LIMITS.fullName) ?? undefined}
        />
        <TvInput
          label="Company Name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          onBlur={() => setCompanyName((value) => sanitizeText(value))}
          placeholder="e.g. Brandon Trucking LLC"
          error={errors.companyName}
          counter={
            getTextCounter(companyName, TEXT_LIMITS.company) ?? undefined
          }
        />
        <p className="-mt-2 text-[12px] text-[var(--color-text-muted)]">
          Required to generate invoices
        </p>
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
          label="EIN (Tax ID)"
          value={ein}
          onChange={(event) => setEin(event.target.value)}
          onBlur={() => setEin((value) => sanitizeText(value))}
          placeholder="XX-XXXXXXX"
        />
        <TvTextarea
          label="Truck info"
          value={truckInfo}
          onChange={(event) => setTruckInfo(event.target.value)}
          onBlur={() => setTruckInfo((value) => sanitizeText(value))}
          maxLength={TEXT_LIMITS.truckInfo}
          rows={3}
          error={errors.truckInfo}
        />
        <p className="-mt-2 text-[12px] text-[var(--color-text-muted)]">
          Unit number, year, make, and model
        </p>
        {getTextCounter(truckInfo, TEXT_LIMITS.truckInfo) ? (
          <p className="-mt-2 text-[12px] text-[var(--color-text-muted)]">
            {getTextCounter(truckInfo, TEXT_LIMITS.truckInfo)}
          </p>
        ) : null}

        {formError ? (
          <div className="tv-error-state px-4 py-3">
            <p className="text-[14px]">{formError}</p>
          </div>
        ) : null}

        {saved ? (
          <p className="text-[14px] text-[var(--color-success-text)]">
            Profile updated.
          </p>
        ) : null}

        <TvButton loading={loading} onClick={saveProfile}>
          Save changes
        </TvButton>
      </div>
    </>
  );
}
