"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shell/app-header";
import { TvButton } from "@/components/tv/tv-button";
import { APP_ROUTES } from "@/lib/constants";

export default function EditProfilePage() {
  return (
    <>
      <AppHeader title="Edit Profile" />
      <div className="mt-6 px-5">
        <p className="tv-body text-[16px] text-[var(--color-text-secondary)]">
          Update your name, company, MC, and DOT from profile setup.
        </p>
        <Link href={APP_ROUTES.profileSetup} className="mt-4 block">
          <TvButton>Open Profile Setup</TvButton>
        </Link>
      </div>
    </>
  );
}
