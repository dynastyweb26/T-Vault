import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants";

export function MarketingFooter() {
  return (
    <footer className="mt-10 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[var(--color-shell-border)] pt-6 text-center">
      <Link href={APP_ROUTES.contact} className="tv-link text-[14px]">
        Contact
      </Link>
      <Link href={APP_ROUTES.privacy} className="tv-link text-[14px]">
        Privacy Policy
      </Link>
      <Link href={APP_ROUTES.terms} className="tv-link text-[14px]">
        Terms of Use
      </Link>
    </footer>
  );
}
