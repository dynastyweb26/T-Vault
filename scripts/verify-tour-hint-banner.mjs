/**
 * Verify tour hint banner DB state (server-side only).
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: NEXT_PUBLIC_SUPABASE_ANON_KEY (login verification)
 *
 * Run: node scripts/verify-tour-hint-banner.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TRUCKER_TESTERS = Array.from({ length: 6 }, (_, i) => ({
  email: `tester${i + 1}@dynastywebtest.com`,
  password: `BetaTester${i + 1}!`,
}));

const UX_TESTER = {
  email: "tester7@dynastywebtest.com",
  password: "BetaTester7!",
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
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function findUserIdByEmail(admin, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  loadEnvFile();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Checking has_dismissed_tour_hint column...");

  const { data: sampleRow, error: columnError } = await admin
    .from("users")
    .select("id, has_dismissed_tour_hint")
    .limit(1)
    .maybeSingle();

  if (columnError) {
    console.error(
      "Column check failed. Apply migration 20250617000004_tour_hint_dismissed.sql first."
    );
    console.error(columnError.message);
    process.exit(1);
  }

  console.log(
    `Column exists (sample has_dismissed_tour_hint=${sampleRow?.has_dismissed_tour_hint ?? "null"})\n`
  );

  console.log("--- Beta testers should default to false ---");
  for (const tester of [...TRUCKER_TESTERS, UX_TESTER]) {
    const userId = await findUserIdByEmail(admin, tester.email);
    if (!userId) {
      console.error(`✗ ${tester.email} not found in auth`);
      process.exit(1);
    }

    const { data: profile, error } = await admin
      .from("users")
      .select("has_dismissed_tour_hint")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(`✗ ${tester.email} profile query failed: ${error.message}`);
      process.exit(1);
    }

    const dismissed = profile?.has_dismissed_tour_hint === true;
    console.log(
      `${tester.email} | has_dismissed_tour_hint:${profile?.has_dismissed_tour_hint ?? false} | should_show_banner:${!dismissed}`
    );
  }

  if (!anonKey) {
    console.log("\nSkipping login/dismiss persistence test (no anon key).");
    return;
  }

  console.log("\n--- Dismiss persistence test (tester7) ---");
  const tester7Id = await findUserIdByEmail(admin, UX_TESTER.email);
  if (!tester7Id) process.exit(1);

  await admin
    .from("users")
    .update({ has_dismissed_tour_hint: false })
    .eq("id", tester7Id);

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: UX_TESTER.email,
    password: UX_TESTER.password,
  });
  if (signInError) {
    console.error("Login failed:", signInError.message);
    process.exit(1);
  }

  const { data: beforeDismiss } = await client
    .from("users")
    .select("has_dismissed_tour_hint")
    .eq("id", tester7Id)
    .maybeSingle();

  console.log(`Before dismiss: ${beforeDismiss?.has_dismissed_tour_hint ?? false}`);

  const { error: dismissError } = await client
    .from("users")
    .update({ has_dismissed_tour_hint: true })
    .eq("id", tester7Id);

  if (dismissError) {
    console.error("Dismiss update failed:", dismissError.message);
    process.exit(1);
  }

  await client.auth.signOut();

  const relog = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await relog.auth.signInWithPassword({
    email: UX_TESTER.email,
    password: UX_TESTER.password,
  });

  const { data: afterRelog } = await relog
    .from("users")
    .select("has_dismissed_tour_hint")
    .eq("id", tester7Id)
    .maybeSingle();

  console.log(`After re-login: ${afterRelog?.has_dismissed_tour_hint ?? false}`);

  if (afterRelog?.has_dismissed_tour_hint !== true) {
    console.error("Dismiss persistence test failed.");
    process.exit(1);
  }

  await relog.auth.signOut();
  console.log("\nDismiss persistence verified for tester7.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
