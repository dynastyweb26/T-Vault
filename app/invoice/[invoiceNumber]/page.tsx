import type { Metadata } from "next";
import { InvoiceVerificationView } from "@/components/invoice/invoice-verification-view";
import { fetchInvoiceVerification } from "@/lib/invoice-verification/queries";

export const metadata: Metadata = {
  title: "Invoice Verification | T-Vault",
  description: "Verify a T-Vault freight invoice.",
  robots: { index: false, follow: false },
};

export default async function InvoiceVerificationPage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;
  const data = await fetchInvoiceVerification(invoiceNumber);

  if (!data) {
    return <InvoiceVerificationView notFound />;
  }

  return <InvoiceVerificationView data={data} />;
}
