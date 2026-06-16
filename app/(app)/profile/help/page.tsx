import Link from "next/link";
import { AppHeader } from "@/components/shell/app-header";
import { APP_ROUTES } from "@/lib/constants";

export default function HelpPage() {
  return (
    <>
      <AppHeader title="Help" />
      <div className="mt-6 px-5">
        <p className="tv-body text-[16px]">
          T-Vault helps owner-operators document loads, track expenses, and stay
          compliant. For support, email support@tvt.app.
        </p>
        <Link href={APP_ROUTES.dashboard} className="tv-link mt-4 inline-block text-[16px]">
          Back to dashboard
        </Link>
      </div>
    </>
  );
}
