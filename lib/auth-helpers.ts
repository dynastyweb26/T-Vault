import type { UserProfile } from "@/types/database";
import { APP_ROUTES } from "@/lib/constants";

export function hasCompletedOnboarding(profile: UserProfile | null): boolean {
  return profile?.onboarding_completed === true;
}

export function hasCompletedProfileSetup(profile: UserProfile | null): boolean {
  return (
    profile?.profile_setup_completed === true ||
    profile?.profile_setup_skipped === true
  );
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
