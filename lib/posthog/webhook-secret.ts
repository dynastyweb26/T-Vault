import { timingSafeEqual } from "crypto";

const WEBHOOK_SECRET_HEADER = "x-posthog-webhook-secret";

export function verifyPostHogWebhookSecret(
  request: Request,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret) return false;

  const provided = request.headers.get(WEBHOOK_SECRET_HEADER)?.trim();
  if (!provided) return false;

  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
