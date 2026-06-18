/**
 * Reset tour_banner_dismissed=false for all beta tester accounts.
 * Use when re-testing the dashboard hint banner.
 *
 * Run: node scripts/reset-beta-tester-banners.mjs
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

  const emails = Array.from(
    { length: 10 },
    (_, i) => `tester${i + 1}@dynastywebtest.com`
  );

  const { data: users, error: listError } = await admin
    .from("users")
    .select("id, email, tour_banner_dismissed")
    .in("email", emails);

  if (listError) {
    console.error(listError.message);
    process.exit(1);
  }

  for (const email of emails) {
    const row = users.find((u) => u.email?.toLowerCase() === email);
    if (!row) {
      console.log(`${email}: not found`);
      continue;
    }

    const { error } = await admin
      .from("users")
      .update({ tour_banner_dismissed: false })
      .eq("id", row.id);

    if (error) {
      console.error(`${email}: reset failed — ${error.message}`);
      continue;
    }

    console.log(`${email}: tour_banner_dismissed reset to false`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
