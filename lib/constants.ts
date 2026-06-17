export const TEXT_LIMITS = {
  jobName: 80,
  broker: 100,
  location: 100,
  notes: 2000,
  description: 500,
  company: 100,
  fullName: 80,
  truckInfo: 200,
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
  voiceNote: "/voice-note",
  voiceNotes: "/voice-notes",
  documents: "/documents",
  referral: "/referral",
  editProfile: "/profile/edit",
  notificationPrefs: "/profile/notifications",
  deleteAccount: "/profile/delete-account",
  help: "/profile/help",
  privacy: "/profile/privacy",
  terms: "/profile/terms",
  changePassword: "/profile/change-password",
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
  "/voice-note",
  "/voice-notes",
  "/documents",
  "/referral",
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
  "/voice-note",
  "/voice-notes",
  "/documents",
  "/referral",
] as const;

export const AUTH_ROUTES = [
  "/splash",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
] as const;
