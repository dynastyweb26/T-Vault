import { AppHeader } from "@/components/shell/app-header";

export default function TermsPage() {
  return (
    <>
      <AppHeader title="Terms" />
      <div className="mt-6 px-5 pb-8">
        <p className="tv-body text-[16px] text-[var(--color-text-secondary)]">
          By using T-Vault you agree to use the service for lawful trucking
          business purposes. T-Vault is provided as-is without warranty.
        </p>
      </div>
    </>
  );
}
