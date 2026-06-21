import {
  APP_ROUTES,
  AUTH_ROUTES,
  API_ONBOARDING_EXEMPT_EXACT,
  API_PUBLIC_PREFIXES,
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

export type MiddlewareDecision =
  | { action: "allow"; reason: string }
  | { action: "redirect"; redirectTo: string; reason: string }
  | { action: "json"; status: number; error: string; reason: string };

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route);
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));
}

export function requiresOnboarding(pathname: string): boolean {
  return ONBOARDING_REQUIRED_PREFIXES.some((route) => pathname.startsWith(route));
}

export function isPublicApiRoute(pathname: string): boolean {
  return API_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isApiOnboardingExempt(pathname: string): boolean {
  return API_ONBOARDING_EXEMPT_EXACT.some((route) => pathname === route);
}

export function getApiRouteDecision(
  pathname: string,
  hasUser: boolean,
  profile: ProfileFlowState | null
): MiddlewareDecision {
  if (isPublicApiRoute(pathname)) {
    return { action: "allow", reason: "public_api_webhook" };
  }

  if (!hasUser) {
    return {
      action: "json",
      status: 401,
      error: "unauthorized",
      reason: "api_unauthenticated",
    };
  }

  if (isApiOnboardingExempt(pathname)) {
    return { action: "allow", reason: "api_onboarding_exempt" };
  }

  if (!profile) {
    return {
      action: "json",
      status: 403,
      error: "profile_required",
      reason: "api_missing_profile",
    };
  }

  if (!profile.onboarding_completed) {
    return {
      action: "json",
      status: 403,
      error: "onboarding_required",
      reason: "api_onboarding_incomplete",
    };
  }

  return { action: "allow", reason: "api_allowed" };
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
 */
export function getSessionRedirect(
  pathname: string,
  hasUser: boolean,
  profile: ProfileFlowState | null
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

  if (hasUser && isProtectedRoute(pathname)) {
    return getProtectedRouteRedirect(pathname, profile);
  }

  return {
    redirectTo: null,
    reason: "allow_public_or_unrestricted_route",
  };
}

export function resolveMiddlewareDecision(
  pathname: string,
  hasUser: boolean,
  profile: ProfileFlowState | null
): MiddlewareDecision {
  if (pathname.startsWith("/api/")) {
    return getApiRouteDecision(pathname, hasUser, profile);
  }

  const pageDecision = getSessionRedirect(pathname, hasUser, profile);
  if (pageDecision.redirectTo) {
    return {
      action: "redirect",
      redirectTo: pageDecision.redirectTo,
      reason: pageDecision.reason,
    };
  }

  return { action: "allow", reason: pageDecision.reason };
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
