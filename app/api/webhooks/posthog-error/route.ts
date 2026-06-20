import { NextResponse } from "next/server";
import { createLinearIssue } from "@/lib/linear/create-issue";
import {
  parsePostHogErrorWebhook,
  type PostHogWebhookPayload,
} from "@/lib/posthog/parse-error-webhook";
import { verifyPostHogWebhookSecret } from "@/lib/posthog/webhook-secret";

export async function POST(request: Request) {
  const webhookSecret = process.env.POSTHOG_WEBHOOK_SECRET;
  const linearApiKey = process.env.LINEAR_API_KEY;
  const linearTeamId = process.env.LINEAR_TEAM_ID;

  if (!webhookSecret || !linearApiKey || !linearTeamId) {
    console.error("[posthog-error-webhook] missing server configuration");
    return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });
  }

  if (!verifyPostHogWebhookSecret(request, webhookSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostHogWebhookPayload;
  try {
    body = (await request.json()) as PostHogWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parsePostHogErrorWebhook(body);
  if (parsed.kind === "skip") {
    return NextResponse.json({ ok: true, skipped: true, reason: parsed.reason });
  }

  try {
    const issue = await createLinearIssue({
      apiKey: linearApiKey,
      teamId: linearTeamId,
      title: parsed.title,
      description: parsed.description,
    });

    console.info("[posthog-error-webhook] linear issue created", {
      identifier: issue.identifier,
      linearIssueId: issue.id,
      posthogEvent: body.event?.event,
    });

    return NextResponse.json({
      ok: true,
      linear: {
        identifier: issue.identifier,
        url: issue.url,
      },
    });
  } catch (error) {
    console.error("[posthog-error-webhook] linear issue creation failed", error);
    return NextResponse.json({ error: "issue_create_failed" }, { status: 500 });
  }
}
