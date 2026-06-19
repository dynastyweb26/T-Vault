export type ProfileFieldErrorKey =
  | "fullName"
  | "companyName"
  | "mcNumber"
  | "dotNumber"
  | "truckInfo";

const PROFILE_UPDATE_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Please sign in to update your profile.",
  profile_save_failed:
    "We could not save your profile. Check your connection and try again.",
  profile_missing:
    "We could not find your profile. Try signing out and back in.",
};

export function resolveProfileUpdateError(
  error: string | undefined,
  status: number
): string {
  if (status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (error) {
    if (PROFILE_UPDATE_ERROR_MESSAGES[error]) {
      return PROFILE_UPDATE_ERROR_MESSAGES[error];
    }

    if (!/^[a-z0-9_]+$/.test(error)) {
      return error;
    }
  }

  if (status === 401) {
    return PROFILE_UPDATE_ERROR_MESSAGES.unauthorized;
  }

  if (status === 404) {
    return PROFILE_UPDATE_ERROR_MESSAGES.profile_missing;
  }

  return PROFILE_UPDATE_ERROR_MESSAGES.profile_save_failed;
}

export function getProfileFieldErrorKey(
  error: string | undefined
): ProfileFieldErrorKey | null {
  if (!error) return null;
  if (error.includes("Full name")) return "fullName";
  if (error.includes("Company name")) return "companyName";
  if (error.includes("MC Number")) return "mcNumber";
  if (error.includes("DOT Number")) return "dotNumber";
  if (error.includes("Truck info")) return "truckInfo";
  return null;
}
