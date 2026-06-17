export type ThemePreference = "dark" | "light" | "system";
export type ProTier = "free" | "waitlist" | "pro";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  truck_info: string | null;
  phone: string | null;
  theme_preference: ThemePreference | null;
  onboarding_completed: boolean | null;
  profile_setup_completed: boolean | null;
  profile_setup_skipped: boolean | null;
  tour_banner_dismissed: boolean | null;
  has_dismissed_tour_hint?: boolean | null;
  referral_code: string | null;
  referred_by: string | null;
  invoice_count: number | null;
  total_lifetime_earnings: number | null;
  total_lifetime_loads: number | null;
  best_month_earnings: number | null;
  best_month_date: string | null;
  streak_days: number | null;
  last_active_date: string | null;
  cost_per_mile?: number | null;
  detention_rate?: number | null;
  pro_tier?: ProTier | null;
  upgrade_dismissed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PasswordStrength = "weak" | "fair" | "strong";

export type VoiceNoteCategory = "expense" | "general";
export type VoiceSuggestedAction = "log_expense" | "note_only";
export type ExpenseCategory =
  | "fuel"
  | "lumper"
  | "tolls"
  | "scales"
  | "parking"
  | "other";

export interface VoiceNote {
  id: string;
  user_id: string;
  transcript: string | null;
  category: VoiceNoteCategory;
  suggested_action: VoiceSuggestedAction | null;
  extracted_amount: number | null;
  extracted_category: ExpenseCategory | null;
  extracted_description: string | null;
  audio_path: string | null;
  job_id: string | null;
  processed: boolean;
  created_at: string;
  updated_at: string;
}

export type WalletDocumentType =
  | "cdl"
  | "medical"
  | "truck_registration"
  | "trailer_registration"
  | "cargo_insurance"
  | "liability_insurance"
  | "custom";

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: WalletDocumentType | string;
  custom_name: string | null;
  file_path: string | null;
  file_url: string | null;
  expiry_date: string | null;
  reminder_sent_60: boolean;
  reminder_sent_30: boolean;
  reminder_sent_7: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | "weekly_earnings"
  | "missing_docs"
  | "invoice_reminder"
  | "payment_overdue"
  | "streak_at_risk"
  | "document_expiry"
  | "welcome";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  deep_link: string | null;
  read: boolean;
  sent_at: string;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  weekly_earnings: boolean;
  missing_docs: boolean;
  invoice_reminder: boolean;
  payment_overdue: boolean;
  streak_at_risk: boolean;
  document_expiry: boolean;
  welcome: boolean;
  push_subscription: Record<string, unknown> | null;
  updated_at: string;
}

export interface VoiceNoteResult {
  transcript: string;
  category: VoiceNoteCategory;
  suggested_action: VoiceSuggestedAction;
  extracted_amount: number | null;
  extracted_category: ExpenseCategory | null;
  extracted_description: string;
}
