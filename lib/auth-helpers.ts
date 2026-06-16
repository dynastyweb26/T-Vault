import type { UserProfile } from "@/types/database";
import { APP_ROUTES, ONBOARDING_STORAGE_KEY } from "@/lib/constants";

export function hasCompletedOnboarding(
  profile: UserProfile | null,
  userId?: string | null
): boolean {
  if (profile?.onboarding_completed) return true;
  if (typeof window === "undefined" || !userId) return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === userId;
}

export function markOnboardingComplete(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, userId);
}

export function getPostAuthRedirect(profile: UserProfile | null): string {
  if (!profile?.onboarding_completed) {
    return APP_ROUTES.onboarding;
  }

  if (!profile.profile_setup_completed && !profile.profile_setup_skipped) {
    return APP_ROUTES.profileSetup;
  }

  return APP_ROUTES.dashboard;
}

export async function fetchUserProfile(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => {
          single: () => Promise<{
            data: UserProfile | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  },
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}
