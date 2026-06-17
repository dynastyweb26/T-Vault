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

function getSessionRedirect(pathname, hasUser, profile) {
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
    const redirect = getSessionRedirect(current, hasUser, profile);
    visited.push({ from: current, to: redirect });

    if (!redirect || redirect === current) {
      return { cycle: false, visited };
    }

    const repeated = visited.filter((entry) => entry.from === redirect);
    if (repeated.length > 0) {
      return { cycle: true, visited };
    }

    current = redirect;
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
        console.error(`  ${entry.from} -> ${entry.to ?? "(allow)"}`);
      }
    }
  }
}

// Explicit regression: completed onboarding must not bounce with profile-setup.
const regression = detectCycle(APP_ROUTES.profileSetup, true, {
  onboarding_completed: true,
  profile_setup_completed: false,
  profile_setup_skipped: false,
});

if (regression.cycle) {
  failures += 1;
  console.error("REGRESSION: profile-setup loops for users who finished onboarding");
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
  const actual = getSessionRedirect(check.path, check.hasUser, check.profile);
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
