import type { Expense, Job } from "@/types/jobs";
import type { TaxSummaryData } from "@/lib/tax-summary/calculations";

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateTaxSummaryCsv(
  data: TaxSummaryData,
  jobs: Job[],
  expenses: Expense[]
): void {
  const lines: string[] = [];

  lines.push("T-Vault Tax Summary Export");
  lines.push(`Period,${escapeCsv(data.range.label)}`);
  lines.push(`Start,${data.range.start}`);
  lines.push(`End,${data.range.end}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`Total Earned,${data.totalEarned}`);
  lines.push(`Total Expenses,${data.totalExpenses}`);
  lines.push(`Net Income,${data.netIncome}`);
  lines.push(`Miles Driven,${data.milesDriven}`);
  lines.push(
    `Revenue Per Mile,${data.costPerMile.revenuePerMile.toFixed(2)}`
  );
  lines.push(`Cost Per Mile,${data.costPerMile.costPerMile.toFixed(2)}`);
  lines.push(`Net Per Mile,${data.costPerMile.netPerMile.toFixed(2)}`);
  lines.push("");
  lines.push("Jobs");
  lines.push(
    "Job Name,Completion Date,Revenue,Expenses,Net,Miles,Broker,Pickup,Delivery"
  );
  data.jobSummary.forEach((row) => {
    const job = jobs.find((j) => j.id === row.jobId);
    lines.push(
      [
        escapeCsv(row.jobName),
        row.completionDate,
        row.revenue,
        row.expenses,
        row.net,
        job?.miles ?? 0,
        escapeCsv(job?.broker_name ?? ""),
        escapeCsv(job?.pickup_location ?? ""),
        escapeCsv(job?.delivery_location ?? ""),
      ].join(",")
    );
  });
  lines.push("");
  lines.push("Expenses");
  lines.push("Date,Category,Amount,Description,Job ID");
  expenses.forEach((expense) => {
    lines.push(
      [
        expense.expense_date ?? expense.created_at?.slice(0, 10) ?? "",
        escapeCsv(expense.category),
        expense.amount,
        escapeCsv(expense.description ?? ""),
        expense.job_id ?? "",
      ].join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tvault-tax-export-${data.range.start}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
