/**
 * Diagnose why tour hint banner may not appear.
 * Run: node scripts/diagnose-tour-banner.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
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
}

async function main() {
  loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await admin
    .from("users")
    .select("email, tour_banner_dismissed, has_dismissed_tour_hint")
    .order("email");

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  const dismissed = users.filter((u) => u.tour_banner_dismissed === true);
  const showable = users.filter((u) => u.tour_banner_dismissed !== true);

  console.log(`Total users: ${users.length}`);
  console.log(`tour_banner_dismissed=true (banner hidden): ${dismissed.length}`);
  console.log(`tour_banner_dismissed!=true (banner should show): ${showable.length}`);
  console.log("\nBeta testers:");
  for (let n = 1; n <= 10; n++) {
    const email = `tester${n}@dynastywebtest.com`;
    const row = users.find((u) => u.email?.toLowerCase() === email);
    if (!row) {
      console.log(`  ${email}: NOT FOUND`);
      continue;
    }
    const willShow = row.tour_banner_dismissed !== true;
    console.log(
      `  ${email}: tour_banner_dismissed=${row.tour_banner_dismissed} has_dismissed_tour_hint=${row.has_dismissed_tour_hint ?? "n/a"} => banner ${willShow ? "SHOULD SHOW" : "HIDDEN"}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
