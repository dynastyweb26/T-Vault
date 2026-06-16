export type ThemePreference = "dark" | "light" | "system";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  mc_number: string | null;
  dot_number: string | null;
  phone: string | null;
  theme_preference: ThemePreference | null;
  onboarding_completed: boolean | null;
  profile_setup_completed: boolean | null;
  profile_setup_skipped: boolean | null;
  referral_code: string | null;
  referred_by: string | null;
  invoice_count: number | null;
  total_lifetime_earnings: number | null;
  total_lifetime_loads: number | null;
  best_month_earnings: number | null;
  best_month_date: string | null;
  streak_days: number | null;
  last_active_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PasswordStrength = "weak" | "fair" | "strong";
