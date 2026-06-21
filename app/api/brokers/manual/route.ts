import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateManualBroker } from "@/lib/brokers/repository";
import { TEXT_LIMITS } from "@/lib/constants";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validation";

const BROKER_MANUAL_MAX_ATTEMPTS = 20;
const BROKER_MANUAL_WINDOW_MS = 60 * 60 * 1000;

const BROKER_NAME_PATTERN = /^[\p{L}\p{N}\s&.,'\-/()]+$/u;

function validateManualBrokerName(raw: unknown): string | null {
  const name = sanitizeText(String(raw ?? ""));
  if (name.length < 2) return null;
  if (name.length > TEXT_LIMITS.broker) return null;
  if (!BROKER_NAME_PATTERN.test(name)) return null;
  return name;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(
      `brokers-manual:${user.id}`,
      BROKER_MANUAL_MAX_ATTEMPTS,
      BROKER_MANUAL_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = await request.json().catch(() => ({}));
    const legalName = validateManualBrokerName(
      (body as { legalName?: unknown }).legalName
    );

    if (!legalName) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const admin = createAdminClient();
    const broker = await findOrCreateManualBroker(admin, legalName);

    return NextResponse.json({ broker });
  } catch (err) {
    console.error("brokers manual route error:", err);
    return NextResponse.json({ error: "broker_manual_failed" }, { status: 500 });
  }
}
