/**
 * Verify tour banner dismiss persistence (server-side only).
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Run: node scripts/verify-tour-banner-dismiss.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UX_TESTER = {
  email: "tester8@dynastywebtest.com",
  password: "BetaTester8!",
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

  console.log("Checking tour_banner_dismissed column...");
  const { error: columnError } = await admin
    .from("users")
    .select("id, tour_banner_dismissed")
    .limit(1)
    .maybeSingle();

  if (columnError) {
    console.error("Column missing. Apply migration 20250617000005_tour_banner_dismissed.sql");
    console.error(columnError.message);
    process.exit(1);
  }

  if (!anonKey) {
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY required for login verification");
    process.exit(1);
  }

  const userId = await findUserIdByEmail(admin, UX_TESTER.email);
  if (!userId) {
    console.error(`${UX_TESTER.email} not found`);
    process.exit(1);
  }

  await admin
    .from("users")
    .update({ tour_banner_dismissed: false })
    .eq("id", userId);

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: UX_TESTER.email,
    password: UX_TESTER.password,
  });
  if (signInError) throw new Error(signInError.message);

  const { data: before } = await client
    .from("users")
    .select("tour_banner_dismissed")
    .eq("id", userId)
    .single();
  console.log(`Before dismiss: ${before.tour_banner_dismissed}`);

  const { error: dismissError } = await client
    .from("users")
    .update({ tour_banner_dismissed: true })
    .eq("id", userId);
  if (dismissError) throw new Error(dismissError.message);

  const { data: afterDismiss } = await client
    .from("users")
    .select("tour_banner_dismissed")
    .eq("id", userId)
    .single();
  console.log(`After dismiss (same session): ${afterDismiss.tour_banner_dismissed}`);

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
    .select("tour_banner_dismissed")
    .eq("id", userId)
    .single();
  console.log(`After re-login: ${afterRelog.tour_banner_dismissed}`);

  if (afterRelog.tour_banner_dismissed !== true) {
    console.error("Dismiss persistence failed.");
    process.exit(1);
  }

  await relog.auth.signOut();
  console.log("tour_banner_dismissed persists correctly across sessions.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
