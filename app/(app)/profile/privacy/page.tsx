import { AppHeader } from "@/components/shell/app-header";

export default function PrivacyPage() {
  return (
    <>
      <AppHeader title="Privacy" />
      <div className="mt-6 px-5 pb-8">
        <p className="tv-body text-[16px] text-[var(--color-text-secondary)]">
          Your data is stored securely in Supabase with row-level security. Only
          you can access your loads, documents, and expenses. We never sell your
          data.
        </p>
      </div>
    </>
  );
}
