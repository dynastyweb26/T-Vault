export const TEXT_LIMITS = {
  jobName: 80,
  broker: 100,
  location: 100,
  notes: 2000,
  description: 500,
  company: 100,
  fullName: 80,
} as const;

export const LOAD_VALUE_MAX = 999_999;

export const ONBOARDING_STORAGE_KEY = "tvault_onboarding_seen";

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
} as const;

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/loads",
  "/new-job",
  "/expenses",
  "/profile",
  "/onboarding",
  "/profile-setup",
] as const;

export const AUTH_ROUTES = [
  "/splash",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
] as const;
