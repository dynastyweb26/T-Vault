export type DocumentType =
  | "rate_confirmation"
  | "bol"
  | "pod"
  | "invoice"
  | "fuel_receipt"
  | "lumper_receipt"
  | "detention_invoice";

export type DetentionLocation = "pickup" | "delivery";

export type DetentionOutcome = "yes" | "no" | "waiting";

export type MilestoneType =
  | "first_load"
  | "loads_10"
  | "loads_50"
  | "loads_100"
  | "first_10k_month"
  | "best_month";

export interface MilestoneCheck {
  type: MilestoneType;
  title: string;
  subtitle: string;
}

export interface DetentionSession {
  id: string;
  user_id: string;
  job_id: string;
  location_type: DetentionLocation;
  timer_start: string;
  timer_end: string | null;
  total_minutes: number | null;
  amount_owed: number | null;
  detention_invoice_url: string | null;
  paid: DetentionOutcome | null;
  created_at: string | null;
}

export interface BrokerRating {
  id: string;
  user_id: string;
  broker_name: string;
  total_loads: number;
  on_time_count: number;
  late_count: number;
  problem_count: number;
  detention_unpaid_count: number;
}

export interface MilestoneRecord {
  id: string;
  user_id: string;
  milestone_type: MilestoneType;
  achieved_at: string;
}

export interface LoadTemplate {
  id: string;
  job_name: string;
  template_name?: string | null;
  broker_name: string | null;
  load_value: number | null;
  pickup_location: string | null;
  delivery_location: string | null;
  payment_type: string | null;
  factoring_company: string | null;
  miles: number | null;
  notes: string | null;
}

export type BrokerBadgeTone = "success" | "warning" | "danger" | null;

export interface BrokerBadgeInfo {
  tone: BrokerBadgeTone;
  label: string;
  totalLoads: number;
  history: Array<{
    jobName: string;
    status: string;
    amount: number;
    paidOnTime: boolean | null;
  }>;
}
