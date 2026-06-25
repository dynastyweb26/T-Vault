import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { PublicLegalPage } from "@/components/legal/public-legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — T-Vault",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLegalPage title="Privacy Policy">
      <PrivacyPolicyContent />
    </PublicLegalPage>
  );
}
