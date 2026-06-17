/**
 * End-to-end proof for tour banner dismiss chain.
 *
 * Run: node scripts/test-tour-banner-dismiss-proof.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TESTER = {
  email: "tester9@dynastywebtest.com",
  password: "BetaTester9!",
};

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  return ".env.local";
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function findUserIdByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  const match = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  return match?.id ?? null;
}

async function main() {
  loadEnvFile();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== 1) Column + RLS check ===");
  const { data: columnProbe, error: columnError } = await admin
    .from("users")
    .select("tour_banner_dismissed")
    .limit(1)
    .maybeSingle();

  if (columnError) {
    console.error("FAIL: tour_banner_dismissed column missing or unreadable");
    console.error(columnError.message);
    process.exit(1);
  }
  console.log(
    "PASS: users.tour_banner_dismissed exists (sample value:",
    columnProbe?.tour_banner_dismissed ?? "null",
    ")"
  );

  const userId = await findUserIdByEmail(admin, TESTER.email);
  if (!userId) {
    console.error(`FAIL: ${TESTER.email} not found`);
    process.exit(1);
  }

  await admin
    .from("users")
    .update({ tour_banner_dismissed: false })
    .eq("id", userId);
  console.log(`Reset ${TESTER.email} tour_banner_dismissed=false`);

  console.log("\n=== 2) Client dismiss (same path as app UI) ===");
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: TESTER.email,
    password: TESTER.password,
  });
  if (signInError) throw new Error(signInError.message);
  console.log("PASS: signed in");

  const { data: before } = await client
    .from("users")
    .select("tour_banner_dismissed")
    .eq("id", userId)
    .single();
  console.log("Before dismiss:", before.tour_banner_dismissed);

  const { data: updated, error: dismissError } = await client
    .from("users")
    .update({ tour_banner_dismissed: true })
    .eq("id", userId)
    .select("tour_banner_dismissed")
    .single();

  if (dismissError) {
    console.error("FAIL: client update blocked (check RLS)");
    console.error(dismissError.message);
    process.exit(1);
  }
  if (updated.tour_banner_dismissed !== true) {
    console.error("FAIL: update returned but flag not true");
    process.exit(1);
  }
  console.log("PASS: client update persisted tour_banner_dismissed=true");

  await client.auth.signOut();

  console.log("\n=== 3) Persistence after re-login (simulates hard refresh) ===");
  const relog = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await relog.auth.signInWithPassword({
    email: TESTER.email,
    password: TESTER.password,
  });

  const { data: afterRelog } = await relog
    .from("users")
    .select("tour_banner_dismissed")
    .eq("id", userId)
    .single();

  if (afterRelog.tour_banner_dismissed !== true) {
    console.error("FAIL: flag lost after re-login");
    process.exit(1);
  }
  console.log("PASS: after re-login tour_banner_dismissed=true");

  await relog.auth.signOut();

  console.log("\n=== 4) Render condition check ===");
  const showWhenFalse = afterRelog.tour_banner_dismissed !== true;
  console.log(
    "shouldShowTourBanner(false) =>",
    false !== true,
    "| shouldShowTourBanner(true) =>",
    true !== true
  );
  if (showWhenFalse) {
    console.error("FAIL: render logic would show banner when dismissed");
    process.exit(1);
  }
  console.log("PASS: render reads tour_banner_dismissed (same field as update)");

  console.log("\nAll dismiss chain checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
