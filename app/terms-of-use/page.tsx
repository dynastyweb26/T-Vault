import type { Metadata } from "next";
import { TermsOfUseContent } from "@/components/legal/terms-of-use-content";
import { PublicLegalPage } from "@/components/legal/public-legal-page";

export const metadata: Metadata = {
  title: "Terms of Use — T-Vault",
};

export default function TermsOfUsePage() {
  return (
    <PublicLegalPage title="Terms of Use">
      <TermsOfUseContent />
    </PublicLegalPage>
  );
}
