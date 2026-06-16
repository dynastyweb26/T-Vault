export type JobStatus = "active" | "completed" | "cancelled" | "archived";

export interface Job {
  id: string;
  user_id: string;
  job_name: string;
  load_value: number | null;
  broker_name: string | null;
  pickup_location: string | null;
  delivery_location: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  status: JobStatus | string;
  miles: number | null;
  updated_at: string | null;
  created_at: string | null;
  payment_received: boolean | null;
  payment_expected_date: string | null;
  payment_received_date: string | null;
  invoice_sent_date: string | null;
  invoice_number: string | null;
  rate_confirmation_url: string | null;
  bol_url: string | null;
  pod_url: string | null;
  is_template: boolean | null;
}

export interface Expense {
  id: string;
  user_id: string;
  job_id: string | null;
  amount: number;
  category: string;
  expense_date: string | null;
  created_at: string | null;
  description: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  job_id: string;
  invoice_number: string | null;
  amount: number | null;
  payment_type: string | null;
  expected_date: string | null;
  received_date: string | null;
  status: string | null;
  days_outstanding: number | null;
  created_at: string | null;
}

export type JobBorderStatus =
  | "docs_complete"
  | "invoice_pending"
  | "docs_missing"
  | "payment_overdue"
  | "cancelled";

export interface DashboardJobView extends Job {
  docsComplete: number;
  docsTotal: number;
  borderStatus: JobBorderStatus;
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "disabled";
}

export interface AttentionItem {
  id: string;
  jobId: string;
  jobName: string;
  type: "missing_docs" | "overdue_invoice";
  message: string;
  href: string;
}

export interface AwaitingPaymentItem {
  id: string;
  jobId: string;
  jobName: string;
  amount: number;
  expectedDate: string | null;
  daysOverdue: number;
  isOverdue: boolean;
}

export interface DashboardData {
  earnedThisMonth: number;
  loadsCompletedThisMonth: number;
  yearOverYearDiff: number | null;
  yearOverYearHasData: boolean;
  projectedAnnual: number | null;
  activeLoadsCount: number;
  totalMilesThisMonth: number;
  streakDays: number;
  expensesThisMonth: number;
  netSoFar: number;
  activeJobs: DashboardJobView[];
  attentionItems: AttentionItem[];
  awaitingPayments: AwaitingPaymentItem[];
}
