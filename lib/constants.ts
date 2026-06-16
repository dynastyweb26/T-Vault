export const TEXT_LIMITS = {
  jobName: 80,
  broker: 100,
  location: 100,
  notes: 2000,
  description: 500,
  company: 100,
  fullName: 80,
  brokerRatingNotes: 200,
} as const;

export const LOAD_VALUE_MAX = 999_999;

export const APP_ROUTES = {
  splash: "/splash",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  onboarding: "/onboarding",
  profileSetup: "/profile-setup",
  dashboard: "/dashboard",
  loads: "/loads",
  newJob: "/new-job",
  expenses: "/expenses",
  profile: "/profile",
  costPerMile: "/cost-per-mile",
  taxSummary: "/tax-summary",
  brokerHistory: "/broker-history",
} as const;

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/loads",
  "/new-job",
  "/expenses",
  "/profile",
  "/cost-per-mile",
  "/tax-summary",
  "/broker-history",
  "/onboarding",
  "/profile-setup",
] as const;

/** App routes that require onboarding_completed before access. */
export const ONBOARDING_REQUIRED_PREFIXES = [
  "/dashboard",
  "/loads",
  "/new-job",
  "/expenses",
  "/profile",
  "/cost-per-mile",
  "/tax-summary",
  "/broker-history",
] as const;

export const AUTH_ROUTES = [
  "/splash",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
] as const;
