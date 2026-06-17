import {
  APP_ROUTES,
  AUTH_ROUTES,
  ONBOARDING_REQUIRED_PREFIXES,
  PROTECTED_PREFIXES,
} from "@/lib/constants";

export type ProfileFlowState = {
  onboarding_completed: boolean | null;
  profile_setup_completed: boolean | null;
  profile_setup_skipped: boolean | null;
};

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route);
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));
}

export function requiresOnboarding(pathname: string): boolean {
  return ONBOARDING_REQUIRED_PREFIXES.some((route) => pathname.startsWith(route));
}

/**
 * Returns the pathname to redirect to, or null when the request should proceed.
 */
export function getProtectedRouteRedirect(
  pathname: string,
  profile: ProfileFlowState | null
): string | null {
  if (!profile) {
    return APP_ROUTES.splash;
  }

  const isOnboardingRoute = pathname === APP_ROUTES.onboarding;
  const isProfileSetupRoute = pathname === APP_ROUTES.profileSetup;
  const needsOnboarding = requiresOnboarding(pathname);

  if (!profile.onboarding_completed) {
    if (needsOnboarding || isProfileSetupRoute) {
      return APP_ROUTES.onboarding;
    }
    return null;
  }

  if (isOnboardingRoute) {
    return !profile.profile_setup_completed && !profile.profile_setup_skipped
      ? APP_ROUTES.profileSetup
      : APP_ROUTES.dashboard;
  }

  if (
    !profile.profile_setup_completed &&
    !profile.profile_setup_skipped &&
    needsOnboarding
  ) {
    return APP_ROUTES.profileSetup;
  }

  if (
    (profile.profile_setup_completed || profile.profile_setup_skipped) &&
    isProfileSetupRoute
  ) {
    return APP_ROUTES.dashboard;
  }

  return null;
}

/**
 * Returns the pathname to redirect to for session-aware routing, or null.
 */
export function getSessionRedirect(
  pathname: string,
  hasUser: boolean,
  profile: ProfileFlowState | null
): string | null {
  if (!hasUser && isProtectedRoute(pathname)) {
    return APP_ROUTES.signIn;
  }

  if (hasUser && isAuthRoute(pathname) && pathname !== APP_ROUTES.splash) {
    return APP_ROUTES.splash;
  }

  if (hasUser && isProtectedRoute(pathname)) {
    return getProtectedRouteRedirect(pathname, profile);
  }

  return null;
}
