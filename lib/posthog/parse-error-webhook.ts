export const ERROR_TRACKING_ISSUE_CREATED = "$error_tracking_issue_created";

export type PostHogWebhookPayload = {
  event?: {
    event?: string;
    uuid?: string;
    timestamp?: string;
    url?: string;
    distinct_id?: string;
    properties?: Record<string, unknown>;
  };
  person?: Record<string, unknown>;
  project?: {
    id?: number;
    name?: string;
    url?: string;
  };
};

type ParsedIssue = {
  kind: "issue";
  title: string;
  description: string;
};

type ParsedSkip = {
  kind: "skip";
  reason: string;
};

export type ParsedPostHogErrorWebhook = ParsedIssue | ParsedSkip;

type ExceptionListEntry = {
  type?: string;
  value?: string;
  stacktrace?: {
    frames?: Array<Record<string, unknown>>;
  };
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const next = asString(value);
    if (next) return next;
  }
  return undefined;
}

function firstInArray(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return asString(value[0]);
}

function formatStackSnippet(frames: Array<Record<string, unknown>> | undefined): string | undefined {
  if (!frames?.length) return undefined;

  const lines = frames
    .slice(0, 8)
    .map((frame) => {
      const fn = asString(frame.function) ?? asString(frame.method) ?? "?";
      const file =
        asString(frame.filename) ??
        asString(frame.abs_path) ??
        asString(frame.source) ??
        "?";
      const line = frame.lineno ?? frame.line ?? frame.lineNumber;
      const col = frame.colno ?? frame.col ?? frame.columnNumber;
      const location =
        line !== undefined
          ? `${file}:${line}${col !== undefined ? `:${col}` : ""}`
          : file;
      return `  at ${fn} (${location})`;
    });

  return lines.join("\n");
}

function extractExceptionDetails(properties: Record<string, unknown>) {
  const exceptionList = properties.$exception_list as ExceptionListEntry[] | undefined;
  const first = exceptionList?.[0];

  const type =
    first?.type ??
    firstInArray(properties.$exception_types) ??
    asString(properties.$exception_type);

  const message =
    first?.value ??
    firstInArray(properties.$exception_values) ??
    asString(properties.$exception_message);

  const stackSnippet =
    formatStackSnippet(first?.stacktrace?.frames) ??
    asString(properties.$exception_stack_trace_raw);

  return { type, message, stackSnippet };
}

function buildTitle(
  type: string | undefined,
  message: string | undefined,
  issueName: string | undefined,
): string {
  const composed = [type, message].filter(Boolean).join(": ");
  const base = composed || issueName || "PostHog error";
  return base.length > 200 ? `${base.slice(0, 197)}...` : base;
}

function buildDescription(input: {
  type?: string;
  message?: string;
  stackSnippet?: string;
  issueName?: string;
  issueId?: string;
  posthogUrl?: string;
  timestamp?: string;
  distinctId?: string;
}): string {
  const sections: string[] = [
    "Automatic issue created from PostHog Error Tracking.",
    "",
  ];

  if (input.issueName) sections.push(`**Issue:** ${input.issueName}`);
  if (input.type) sections.push(`**Type:** ${input.type}`);
  if (input.message) sections.push(`**Message:** ${input.message}`);
  if (input.issueId) sections.push(`**PostHog issue ID:** ${input.issueId}`);
  if (input.distinctId) sections.push(`**Distinct ID:** ${input.distinctId}`);
  if (input.timestamp) sections.push(`**First seen:** ${input.timestamp}`);

  if (input.stackSnippet) {
    sections.push("", "**Stack trace (snippet):**", "```", input.stackSnippet, "```");
  }

  if (input.posthogUrl) {
    sections.push("", `[View in PostHog](${input.posthogUrl})`);
  }

  return sections.join("\n");
}

export function parsePostHogErrorWebhook(
  body: PostHogWebhookPayload,
): ParsedPostHogErrorWebhook {
  const eventName = body.event?.event;
  if (eventName !== ERROR_TRACKING_ISSUE_CREATED) {
    return {
      kind: "skip",
      reason: eventName ?? "missing_event_name",
    };
  }

  const properties = body.event?.properties ?? {};
  const exceptionProps =
    (properties.exception_props as Record<string, unknown> | undefined) ?? {};
  const mergedProps = { ...exceptionProps, ...properties };

  const { type, message, stackSnippet } = extractExceptionDetails(mergedProps);
  const issueName = firstString(properties.name, properties.$exception_issue_name);
  const issueId = firstString(properties.$exception_issue_id, properties.id);
  const posthogUrl = firstString(body.event?.url, properties.$exception_issue_url);

  return {
    kind: "issue",
    title: buildTitle(type, message, issueName),
    description: buildDescription({
      type,
      message,
      stackSnippet,
      issueName,
      issueId,
      posthogUrl,
      timestamp: body.event?.timestamp,
      distinctId: body.event?.distinct_id,
    }),
  };
}
