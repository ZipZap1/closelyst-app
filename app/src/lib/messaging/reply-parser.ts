import type { ReplyAction } from "./types";

const CONFIRM_TOKENS = new Set([
  "ja",
  "yes",
  "y",
  "ok",
  "okay",
  "bestaetigt",
  "bestätigt",
  "bestätige",
  "bestaetige",
  "confirm",
  "confirmed",
  "1"
]);

const CANCEL_TOKENS = new Set([
  "nein",
  "no",
  "n",
  "cancel",
  "storno",
  "absagen",
  "abgesagt",
  "stop",
  "2"
]);

function normalize(body: string): string {
  return body
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

export function parseReplyAction(body: string): ReplyAction {
  if (!body) return "noop";
  const normalized = normalize(body);
  if (!normalized) return "noop";

  const tokens = normalized.split(/\s+/);
  const first = tokens[0] ?? "";

  if (CONFIRM_TOKENS.has(first)) return "confirm";
  if (CANCEL_TOKENS.has(first)) return "cancel";

  for (const t of tokens) {
    if (CONFIRM_TOKENS.has(t)) return "confirm";
    if (CANCEL_TOKENS.has(t)) return "cancel";
  }

  return "noop";
}
