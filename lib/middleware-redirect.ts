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

export type RedirectDecision = {
  redirectTo: string | null;
  reason: string;
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

function summarizeProfile(profile: ProfileFlowState | null): string {
  if (!profile) return "null";
  return JSON.stringify({
    onboarding_completed: profile.onboarding_completed,
    profile_setup_completed: profile.profile_setup_completed,
    profile_setup_skipped: profile.profile_setup_skipped,
  });
}

/**
 * Returns the pathname to redirect to, or null when the request should proceed.
 */
export function getProtectedRouteRedirect(
  pathname: string,
  profile: ProfileFlowState | null
): RedirectDecision {
  if (!profile) {
    return {
      redirectTo: APP_ROUTES.splash,
      reason: "protected_route_missing_profile",
    };
  }

  const isOnboardingRoute = pathname === APP_ROUTES.onboarding;
  const isProfileSetupRoute = pathname === APP_ROUTES.profileSetup;
  const needsOnboarding = requiresOnboarding(pathname);

  if (!profile.onboarding_completed) {
    if (needsOnboarding || isProfileSetupRoute) {
      return {
        redirectTo: APP_ROUTES.onboarding,
        reason: "onboarding_incomplete",
      };
    }
    return {
      redirectTo: null,
      reason: "allow_onboarding_flow_route",
    };
  }

  if (isOnboardingRoute) {
    const needsProfileSetup =
      !profile.profile_setup_completed && !profile.profile_setup_skipped;
    return {
      redirectTo: needsProfileSetup ? APP_ROUTES.profileSetup : APP_ROUTES.dashboard,
      reason: needsProfileSetup
        ? "onboarding_complete_needs_profile_setup"
        : "onboarding_complete_go_dashboard",
    };
  }

  if (
    !profile.profile_setup_completed &&
    !profile.profile_setup_skipped &&
    needsOnboarding
  ) {
    return {
      redirectTo: APP_ROUTES.profileSetup,
      reason: "profile_setup_required_for_app_route",
    };
  }

  if (
    (profile.profile_setup_completed || profile.profile_setup_skipped) &&
    isProfileSetupRoute
  ) {
    return {
      redirectTo: APP_ROUTES.dashboard,
      reason: "profile_setup_already_complete",
    };
  }

  return {
    redirectTo: null,
    reason: "allow_protected_route",
  };
}

/**
 * Returns the pathname to redirect to for session-aware routing, or null.
 *
 * Onboarding/profile-setup gating is temporarily disabled to avoid redirect loops.
 * Only authentication is enforced here.
 */
export function getSessionRedirect(
  pathname: string,
  hasUser: boolean,
  _profile: ProfileFlowState | null
): RedirectDecision {
  if (!hasUser && isProtectedRoute(pathname)) {
    return {
      redirectTo: APP_ROUTES.signIn,
      reason: "unauthenticated_protected_route",
    };
  }

  if (hasUser && isAuthRoute(pathname) && pathname !== APP_ROUTES.splash) {
    return {
      redirectTo: APP_ROUTES.splash,
      reason: "authenticated_auth_route",
    };
  }

  return {
    redirectTo: null,
    reason: "allow_public_or_unrestricted_route",
  };
}

export function logRedirectDecision(
  pathname: string,
  hasUser: boolean,
  profile: ProfileFlowState | null,
  decision: RedirectDecision
): void {
  console.info("[middleware-redirect]", {
    pathname,
    hasUser,
    profile: summarizeProfile(profile),
    redirectTo: decision.redirectTo,
    reason: decision.reason,
  });
}
