import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { APP_ROUTES } from "@/lib/constants";

export function PublicLegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tv-auth-page flex-col justify-start px-5 py-10">
      <Link
        href={APP_ROUTES.signIn}
        className="tv-link mb-6 self-start text-[14px]"
      >
        T-Vault
      </Link>
      <h1 className="tv-page-title">{title}</h1>
      <div className="mt-6 w-full">{children}</div>
      <MarketingFooter />
    </div>
  );
}
