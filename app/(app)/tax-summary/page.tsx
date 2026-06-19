"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { TaxSummaryView } from "@/components/tax-summary/tax-summary-view";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTaxSummaryData } from "@/lib/tax-summary/queries";
import {
  getTaxDateRange,
  type TaxRangeId,
} from "@/lib/tax-summary/date-ranges";
import type { TaxSummaryData } from "@/lib/tax-summary/calculations";
import {
  countTaxSummarySupportingDocs,
} from "@/lib/tax-summary/calculations";
import { generateTaxSummaryPdf } from "@/lib/tax-summary/pdf-export";
import { generateTaxSummaryCsv } from "@/lib/tax-summary/csv-export";
import type { Expense, Job } from "@/types/jobs";

export default function TaxSummaryPage() {
  const { user, profile } = useAuth();
  const [rangeId, setRangeId] = useState<TaxRangeId>("this_year");
  const [customStart, setCustomStart] = useState(
    `${new Date().getFullYear()}-01-01`
  );
  const [customEnd, setCustomEnd] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [rawJobs, setRawJobs] = useState<Job[]>([]);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const range = getTaxDateRange(rangeId, customStart, customEnd);

    const result = await fetchTaxSummaryData(supabase, user.id, range);

    setData(result.summary);
    setRawJobs(result.jobs);
    setRawExpenses(result.expenses);
    setLoading(false);
  }, [user, rangeId, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AppHeader
        title="Tax Summary"
        subtitle="Your earnings and expenses for tax purposes"
      />
      <TaxSummaryView
        data={data}
        loading={loading}
        rangeId={rangeId}
        customStart={customStart}
        customEnd={customEnd}
        onRangeChange={setRangeId}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onExportPdf={() => {
          if (!data) return;
          const range = getTaxDateRange(rangeId, customStart, customEnd);
          const supportingDocs = countTaxSummarySupportingDocs(
            rawJobs,
            rawExpenses,
            range
          );
          void generateTaxSummaryPdf({
            data,
            profile,
            receiptsOnFile: supportingDocs.receiptsOnFile,
            invoicesGenerated: supportingDocs.invoicesGenerated,
          });
        }}
        onExportCsv={() =>
          data && generateTaxSummaryCsv(data, rawJobs, rawExpenses)
        }
      />
    </>
  );
}
