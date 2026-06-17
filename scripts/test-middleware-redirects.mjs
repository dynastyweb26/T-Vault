/**
 * Verifies middleware redirect rules do not form cycles for auth flow routes.
 * Run: npm run test:redirects
 */

const APP_ROUTES = {
  splash: "/splash",
  signIn: "/sign-in",
  onboarding: "/onboarding",
  profileSetup: "/profile-setup",
  dashboard: "/dashboard",
};

const AUTH_ROUTES = ["/splash", "/sign-in", "/sign-up", "/forgot-password"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/loads",
  "/onboarding",
  "/profile-setup",
];
const ONBOARDING_REQUIRED_PREFIXES = ["/dashboard", "/loads"];

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some((route) => pathname === route);
}

function isProtectedRoute(pathname) {
  return PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));
}

function requiresOnboarding(pathname) {
  return ONBOARDING_REQUIRED_PREFIXES.some((route) => pathname.startsWith(route));
}

function getProtectedRouteRedirect(pathname, profile) {
  if (!profile) {
    return { redirectTo: APP_ROUTES.splash, reason: "protected_route_missing_profile" };
  }

  const isOnboardingRoute = pathname === APP_ROUTES.onboarding;
  const isProfileSetupRoute = pathname === APP_ROUTES.profileSetup;
  const needsOnboarding = requiresOnboarding(pathname);

  if (!profile.onboarding_completed) {
    if (needsOnboarding || isProfileSetupRoute) {
      return { redirectTo: APP_ROUTES.onboarding, reason: "onboarding_incomplete" };
    }
    return { redirectTo: null, reason: "allow_onboarding_flow_route" };
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

  return { redirectTo: null, reason: "allow_protected_route" };
}

function getSessionRedirect(pathname, hasUser, profile) {
  if (!hasUser && isProtectedRoute(pathname)) {
    return { redirectTo: APP_ROUTES.signIn, reason: "unauthenticated_protected_route" };
  }

  if (hasUser && isAuthRoute(pathname) && pathname !== APP_ROUTES.splash) {
    return { redirectTo: APP_ROUTES.splash, reason: "authenticated_auth_route" };
  }

  if (hasUser && isProtectedRoute(pathname)) {
    const protectedDecision = getProtectedRouteRedirect(pathname, profile);
    return {
      redirectTo: protectedDecision.redirectTo,
      reason: `protected:${protectedDecision.reason}`,
    };
  }

  return { redirectTo: null, reason: "allow_public_or_unrestricted_route" };
}

function getClientRedirect(pathname, clientProfile, profileResynced) {
  if (!clientProfile) return null;

  if (pathname === APP_ROUTES.profileSetup) {
    if (!clientProfile.onboarding_completed) {
      if (!profileResynced) return null;
      return APP_ROUTES.onboarding;
    }
    if (
      clientProfile.profile_setup_completed ||
      clientProfile.profile_setup_skipped
    ) {
      return APP_ROUTES.dashboard;
    }
    return null;
  }

  if (pathname === APP_ROUTES.onboarding) {
    if (clientProfile.onboarding_completed) {
      if (
        !clientProfile.profile_setup_completed &&
        !clientProfile.profile_setup_skipped
      ) {
        return APP_ROUTES.profileSetup;
      }
      return APP_ROUTES.dashboard;
    }
  }

  return null;
}

const FLOW_ROUTES = [
  APP_ROUTES.splash,
  APP_ROUTES.signIn,
  APP_ROUTES.onboarding,
  APP_ROUTES.profileSetup,
  APP_ROUTES.dashboard,
];

const PROFILE_STATES = [
  { name: "no-profile", profile: null },
  {
    name: "needs-onboarding",
    profile: {
      onboarding_completed: false,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
  },
  {
    name: "needs-profile-setup",
    profile: {
      onboarding_completed: true,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
  },
  {
    name: "complete",
    profile: {
      onboarding_completed: true,
      profile_setup_completed: true,
      profile_setup_skipped: false,
    },
  },
];

function detectCycle(startPath, hasUser, profile, maxSteps = 12) {
  const visited = [];
  let current = startPath;

  for (let step = 0; step < maxSteps; step += 1) {
    const decision = getSessionRedirect(current, hasUser, profile);
    visited.push({ from: current, to: decision.redirectTo, reason: decision.reason });

    if (!decision.redirectTo || decision.redirectTo === current) {
      return { cycle: false, visited };
    }

    const repeated = visited.filter((entry) => entry.from === decision.redirectTo);
    if (repeated.length > 0) {
      return { cycle: true, visited };
    }

    current = decision.redirectTo;
  }

  return { cycle: true, visited, reason: "max steps exceeded" };
}

function detectHybridCycle(dbProfile, staleClientProfile, startPath, maxSteps = 12) {
  const visited = [];
  let current = startPath;
  let profileResynced = false;
  let clientProfile = staleClientProfile;

  for (let step = 0; step < maxSteps; step += 1) {
    const middlewareDecision = getSessionRedirect(current, true, dbProfile);
    visited.push({
      step,
      route: current,
      layer: "middleware",
      to: middlewareDecision.redirectTo,
      reason: middlewareDecision.reason,
    });

    if (middlewareDecision.redirectTo) {
      const repeated = visited.filter(
        (entry) => entry.layer === "middleware" && entry.route === middlewareDecision.redirectTo
      );
      if (repeated.length > 0) {
        return { cycle: true, visited };
      }
      current = middlewareDecision.redirectTo;
      continue;
    }

    const clientRedirect = getClientRedirect(current, clientProfile, profileResynced);
    visited.push({
      step,
      route: current,
      layer: "client",
      to: clientRedirect,
      reason: clientRedirect ? "client_redirect" : "allow",
    });

    if (
      current === APP_ROUTES.profileSetup &&
      !clientProfile.onboarding_completed &&
      !profileResynced
    ) {
      profileResynced = true;
      clientProfile = dbProfile;
    }

    if (!clientRedirect || clientRedirect === current) {
      return { cycle: false, visited };
    }

    const repeatedClient = visited.filter(
      (entry) => entry.layer === "client" && entry.route === clientRedirect
    );
    if (repeatedClient.length > 0) {
      return { cycle: true, visited };
    }

    current = clientRedirect;
  }

  return { cycle: true, visited, reason: "max steps exceeded" };
}

let failures = 0;

for (const { name, profile } of PROFILE_STATES) {
  for (const route of FLOW_ROUTES) {
    const hasUser = profile !== null || route !== APP_ROUTES.signIn;
    const result = detectCycle(route, hasUser, profile);

    if (result.cycle) {
      failures += 1;
      console.error(`CYCLE: state=${name} start=${route}`);
      for (const entry of result.visited) {
        console.error(`  ${entry.from} -> ${entry.to ?? "(allow)"} (${entry.reason})`);
      }
    }
  }
}

const regression = detectCycle(APP_ROUTES.profileSetup, true, {
  onboarding_completed: true,
  profile_setup_completed: false,
  profile_setup_skipped: false,
});

if (regression.cycle) {
  failures += 1;
  console.error("REGRESSION: profile-setup loops for users who finished onboarding");
}

const hybridRegression = detectHybridCycle(
  {
    onboarding_completed: true,
    profile_setup_completed: false,
    profile_setup_skipped: false,
  },
  {
    onboarding_completed: false,
    profile_setup_completed: false,
    profile_setup_skipped: false,
  },
  APP_ROUTES.profileSetup
);

if (hybridRegression.cycle) {
  failures += 1;
  console.error(
    "REGRESSION: stale client profile on profile-setup still loops with middleware"
  );
  for (const entry of hybridRegression.visited) {
    console.error(
      `  [${entry.layer}] ${entry.route} -> ${entry.to ?? "(allow)"} (${entry.reason})`
    );
  }
} else {
  console.log(
    "Hybrid stale-profile regression passed (no middleware/client redirect loop)."
  );
}

const flowChecks = [
  {
    name: "splash -> sign-in when signed out",
    path: APP_ROUTES.splash,
    hasUser: false,
    profile: null,
    expected: null,
  },
  {
    name: "sign-in -> splash when signed in",
    path: APP_ROUTES.signIn,
    hasUser: true,
    profile: {
      onboarding_completed: false,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
    expected: APP_ROUTES.splash,
  },
  {
    name: "onboarding allowed while onboarding incomplete",
    path: APP_ROUTES.onboarding,
    hasUser: true,
    profile: {
      onboarding_completed: false,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
    expected: null,
  },
  {
    name: "onboarding -> profile-setup after onboarding complete",
    path: APP_ROUTES.onboarding,
    hasUser: true,
    profile: {
      onboarding_completed: true,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
    expected: APP_ROUTES.profileSetup,
  },
  {
    name: "profile-setup allowed after onboarding complete",
    path: APP_ROUTES.profileSetup,
    hasUser: true,
    profile: {
      onboarding_completed: true,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
    expected: null,
  },
  {
    name: "dashboard -> profile-setup before profile setup",
    path: APP_ROUTES.dashboard,
    hasUser: true,
    profile: {
      onboarding_completed: true,
      profile_setup_completed: false,
      profile_setup_skipped: false,
    },
    expected: APP_ROUTES.profileSetup,
  },
  {
    name: "dashboard allowed after full setup",
    path: APP_ROUTES.dashboard,
    hasUser: true,
    profile: {
      onboarding_completed: true,
      profile_setup_completed: true,
      profile_setup_skipped: false,
    },
    expected: null,
  },
];

for (const check of flowChecks) {
  const actual = getSessionRedirect(check.path, check.hasUser, check.profile).redirectTo;
  if (actual !== check.expected) {
    failures += 1;
    console.error(
      `FLOW CHECK FAILED: ${check.name} (${check.path}) expected ${check.expected}, got ${actual}`
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} redirect cycle(s) detected.`);
  process.exit(1);
}

console.log("All middleware redirect flow checks passed (no cycles).");
