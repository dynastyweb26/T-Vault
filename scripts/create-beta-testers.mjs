/**
 * One-time beta tester provisioning (server-side only).
 *
 * Requires env vars (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY (optional; used only for login verification)
 *
 * Run once:
 *   node scripts/create-beta-testers.mjs
 *
 * Never import this file from app code. Never commit secrets.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TESTERS = Array.from({ length: 10 }, (_, index) => {
  const n = index + 1;
  return {
    n,
    email: `tester${n}@dynastywebtest.com`,
    password: `BetaTester${n}!`,
    fullName: `Beta Tester ${n}`,
    seedLoad: n <= 6,
  };
});

const SAMPLE_LOADS = [
  {
    job_name: "Sample Load — Dallas to Houston",
    broker_name: "Beta Freight Co (Demo)",
    pickup_location: "Dallas, TX",
    delivery_location: "Houston, TX",
    load_value: 2400,
    miles: 239,
  },
  {
    job_name: "Sample Load — Atlanta to Charlotte",
    broker_name: "Peach State Logistics (Demo)",
    pickup_location: "Atlanta, GA",
    delivery_location: "Charlotte, NC",
    load_value: 1850,
    miles: 245,
  },
  {
    job_name: "Sample Load — Chicago to Indianapolis",
    broker_name: "Midwest Haul Partners (Demo)",
    pickup_location: "Chicago, IL",
    delivery_location: "Indianapolis, IN",
    load_value: 1625,
    miles: 183,
  },
  {
    job_name: "Sample Load — Phoenix to Las Vegas",
    broker_name: "Desert Line Brokers (Demo)",
    pickup_location: "Phoenix, AZ",
    delivery_location: "Las Vegas, NV",
    load_value: 2100,
    miles: 300,
  },
  {
    job_name: "Sample Load — Denver to Salt Lake City",
    broker_name: "Mountain West Freight (Demo)",
    pickup_location: "Denver, CO",
    delivery_location: "Salt Lake City, UT",
    load_value: 2750,
    miles: 525,
  },
  {
    job_name: "Sample Load — Memphis to Nashville",
    broker_name: "Music City Carriers (Demo)",
    pickup_location: "Memphis, TN",
    delivery_location: "Nashville, TN",
    load_value: 1480,
    miles: 212,
  },
];

function loadEnvFile() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const line of lines) {
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
    return file;
  }
  return null;
}

function buildReferralCode(fullName, n) {
  const letters = fullName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = letters.length >= 3 ? letters.slice(0, 3) : "BTA";
  return `TVT-${prefix}-${1000 + n}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error(
      "Set it in .env.local (see .env.example). Do not hardcode secrets in this repo."
    );
    process.exit(1);
  }
  return value;
}

async function findAuthUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function ensureAuthUser(admin, tester) {
  const existing = await findAuthUserByEmail(admin, tester.email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: tester.password,
      email_confirm: true,
    });
    if (error) throw error;
    return { userId: existing.id, created: false, user: data.user };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: tester.email,
    password: tester.password,
    email_confirm: true,
    user_metadata: { full_name: tester.fullName },
  });

  if (error) throw error;
  return { userId: data.user.id, created: true, user: data.user };
}

async function ensureUserProfile(admin, tester, userId) {
  const { data: existing, error: readError } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const row = {
    id: userId,
    email: tester.email,
    full_name: tester.fullName,
    referral_code: buildReferralCode(tester.fullName, tester.n),
    onboarding_completed: true,
    profile_setup_completed: true,
    profile_setup_skipped: false,
    streak_days: 1,
    last_active_date: new Date().toISOString().slice(0, 10),
    pro_tier: "free",
  };

  if (existing) {
    const { error } = await admin.from("users").update(row).eq("id", userId);
    if (error) throw error;
    return "updated";
  }

  const { error } = await admin.from("users").insert(row);
  if (error) throw error;
  return "inserted";
}

async function countActiveLoads(admin, userId) {
  const { count, error } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_template", false)
    .is("deleted_at", null);

  if (error) throw error;
  return count ?? 0;
}

async function seedSampleLoad(admin, tester, userId) {
  const existingCount = await countActiveLoads(admin, userId);
  if (existingCount > 0) {
    return { action: "skipped", loadCount: existingCount };
  }

  const sample = SAMPLE_LOADS[tester.n - 1];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("jobs")
    .insert({
      user_id: userId,
      job_name: sample.job_name,
      status: "active",
      broker_name: sample.broker_name,
      load_value: sample.load_value,
      pickup_location: sample.pickup_location,
      delivery_location: sample.delivery_location,
      pickup_date: today,
      delivery_date: tomorrow,
      payment_type: "direct",
      miles: sample.miles,
      notes: "Seeded demo load for beta testing — not a real shipment.",
      is_template: false,
      updated_at: new Date().toISOString(),
    })
    .select("id, job_name")
    .single();

  if (error) throw error;
  return { action: "inserted", job: data, loadCount: 1 };
}

async function verifyLogin(url, anonKey, tester) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: tester.email,
    password: tester.password,
  });

  if (error) return { ok: false, error: error.message };
  await client.auth.signOut();
  return { ok: true, userId: data.user?.id ?? null };
}

async function main() {
  const envFile = loadEnvFile();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Using Supabase project: ${url}`);
  if (envFile) console.log(`Loaded env from: ${envFile}`);
  console.log("Creating/updating 10 beta tester accounts...\n");

  const results = [];

  for (const tester of TESTERS) {
    const line = [`tester${tester.n}`];
    try {
      const auth = await ensureAuthUser(admin, tester);
      line.push(auth.created ? "auth:created" : "auth:exists");

      const profileAction = await ensureUserProfile(admin, tester, auth.userId);
      line.push(`profile:${profileAction}`);

      if (tester.seedLoad) {
        const seed = await seedSampleLoad(admin, tester, auth.userId);
        line.push(`load:${seed.action}`);
        if (seed.job) line.push(`job="${seed.job.job_name}"`);
      } else {
        const loadCount = await countActiveLoads(admin, auth.userId);
        line.push(`loads:${loadCount}`);
      }

      if (anonKey) {
        const login = await verifyLogin(url, anonKey, tester);
        line.push(login.ok ? "login:ok" : `login:fail(${login.error})`);
      }

      results.push({ tester, ok: true, userId: auth.userId });
      console.log(`✓ ${line.join(" | ")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ tester, ok: false, error: message });
      console.error(`✗ tester${tester.n} | ${message}`);
    }
  }

  console.log("\n--- Verification summary ---");

  let allAuthOk = true;
  let truckerLoadsOk = true;

  for (const tester of TESTERS) {
    const authUser = await findAuthUserByEmail(admin, tester.email);
    const authOk =
      !!authUser &&
      !!authUser.email_confirmed_at &&
      authUser.email?.toLowerCase() === tester.email.toLowerCase();

    if (!authOk) allAuthOk = false;

    let loadCount = null;
    if (authUser) {
      loadCount = await countActiveLoads(admin, authUser.id);
    }

    if (tester.seedLoad && loadCount !== 1) truckerLoadsOk = false;
    if (!tester.seedLoad && loadCount !== 0) truckerLoadsOk = false;

    console.log(
      `${tester.email} | auth:${authOk ? "confirmed" : "MISSING"} | active_loads:${loadCount ?? "n/a"}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0 || !allAuthOk || !truckerLoadsOk) {
    console.error("\nProvisioning incomplete. Review errors above.");
    process.exit(1);
  }

  console.log("\nAll 10 beta accounts are present, email-confirmed, and load seeding matches spec.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
