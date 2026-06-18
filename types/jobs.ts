export type JobStatus =
  | "active"
  | "awaiting_payment"
  | "paid"
  | "complete"
  | "completed"
  | "cancelled"
  | "archived";

export type PaymentType = "direct" | "factoring";
export type AiConfidence = "high" | "medium" | "low" | "unread" | "manual";
export type BrokerRatingValue = "on_time" | "late" | "problem";

export interface Job {
  id: string;
  user_id: string;
  job_name: string;
  load_value: number | null;
  broker_name: string | null;
  pickup_location: string | null;
  pickup_facility: string | null;
  delivery_location: string | null;
  delivery_facility: string | null;
  rate_con_number: string | null;
  bol_number: string | null;
  fuel_surcharge: number | null;
  accessorial_charges: number | null;
  commodity: string | null;
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
  invoice_generated: boolean | null;
  invoice_url: string | null;
  payment_type: PaymentType | string | null;
  factoring_company: string | null;
  states_driven: string | null;
  notes: string | null;
  is_template: boolean | null;
  template_name: string | null;
  profitability_score: number | null;
  detention_minutes: number | null;
  detention_paid: string | null;
  ai_fields_confirmed: boolean | null;
  cross_validation_conflicts: import("@/lib/job-folder/ai-types").CrossValidationConflict[] | null;
  broker_rating: BrokerRatingValue | null;
  broker_rating_notes: string | null;
  deleted_at: string | null;
  detention_start_time: string | null;
  detention_location_type: "pickup" | "delivery" | null;
}

export interface JobDocument {
  id: string;
  job_id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  upload_status: string | null;
  ai_confidence: AiConfidence | null;
  parsed_data: Record<string, unknown> | null;
  manual_fields: Record<string, unknown> | null;
  parsing_status: string | null;
  parse_error: string | null;
  created_at: string | null;
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
  receipt_url: string | null;
  no_receipt_reason: string | null;
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

export type DocumentsByJobId = Record<string, JobDocument[]>;
