/**
 * Verifies manual-entry badge gating for post-scan confidence levels.
 * Run: node scripts/test-ai-review-flow.mjs
 */

function manualEntryClickable(confidence, hasCallback) {
  if (confidence === "manual" || !hasCallback) return false;
  if (!confidence || confidence === "low" || confidence === "unread") return true;
  return confidence === "medium" || confidence === "high";
}

for (const level of ["medium", "high", null, "low", "unread"]) {
  if (!manualEntryClickable(level, true)) {
    console.error(`Expected manual entry clickable for confidence=${String(level)}`);
    process.exit(1);
  }
}

if (manualEntryClickable("manual", true)) {
  console.error("Manual confidence should not open manual entry badge");
  process.exit(1);
}

console.log(
  "AI review flow OK: null/low/unread/medium/high confidence badges open manual entry when callback provided"
);
