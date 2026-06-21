import { createAdminClient } from "@/lib/supabase/admin";

/**
 * API route rate limiting.
 *
 * Primary store: Postgres `api_rate_limits` via check_and_record_api_rate_limit()
 * (shared across serverless instances).
 *
 * Planned upgrade: Upstash Redis for lower latency and TTL-native expiry.
 * The in-memory fallback below is used only when the RPC is unavailable.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, RateLimitEntry>();

function checkRateLimitInMemory(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = memoryBuckets.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_and_record_api_rate_limit", {
      p_bucket_key: key,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("rate limit RPC failed:", error.message);
      return checkRateLimitInMemory(key, maxAttempts, windowMs);
    }

    const payload = data as { allowed?: boolean; retry_after_ms?: number } | null;
    return {
      allowed: Boolean(payload?.allowed),
      retryAfterMs: Number(payload?.retry_after_ms ?? 0),
    };
  } catch (err) {
    console.error("rate limit check failed:", err);
    return checkRateLimitInMemory(key, maxAttempts, windowMs);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return Response.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
