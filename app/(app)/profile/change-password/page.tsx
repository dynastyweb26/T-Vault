import Link from "next/link";
import { AppHeader } from "@/components/shell/app-header";
import { APP_ROUTES } from "@/lib/constants";

export default function ChangePasswordPage() {
  return (
    <>
      <AppHeader title="Change Password" />
      <div className="mt-6 px-5">
        <p className="tv-body text-[16px] text-[var(--color-text-secondary)]">
          Use the forgot password flow to reset your password via email.
        </p>
        <Link href={APP_ROUTES.forgotPassword} className="tv-link mt-4 inline-block text-[16px]">
          Reset password
        </Link>
      </div>
    </>
  );
}
