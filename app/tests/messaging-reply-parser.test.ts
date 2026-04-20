import { describe, expect, it } from "vitest";
import { parseReplyAction } from "../src/lib/messaging/reply-parser";

describe("parseReplyAction", () => {
  it("returns noop for empty/whitespace", () => {
    expect(parseReplyAction("")).toBe("noop");
    expect(parseReplyAction("   ")).toBe("noop");
  });

  it.each([
    ["JA", "confirm"],
    ["Ja bitte!", "confirm"],
    ["yes", "confirm"],
    ["Y", "confirm"],
    ["ok", "confirm"],
    ["Bestätigt", "confirm"],
    ["Bestaetigt", "confirm"],
    ["1", "confirm"]
  ])("detects confirm for %s", (input, expected) => {
    expect(parseReplyAction(input)).toBe(expected);
  });

  it.each([
    ["NEIN", "cancel"],
    ["Nein, kann nicht", "cancel"],
    ["no", "cancel"],
    ["storno", "cancel"],
    ["absagen", "cancel"],
    ["STOP", "cancel"],
    ["2", "cancel"]
  ])("detects cancel for %s", (input, expected) => {
    expect(parseReplyAction(input)).toBe(expected);
  });

  it("returns noop for unrelated text", () => {
    expect(parseReplyAction("Wie spät ist mein Termin?")).toBe("noop");
    expect(parseReplyAction("thanks")).toBe("noop");
  });

  it("prefers confirm when confirm-token appears before cancel-token", () => {
    expect(parseReplyAction("Ja, ich komme. Kein Problem.")).toBe("confirm");
  });

  it("strips punctuation so 'Ja!' still parses", () => {
    expect(parseReplyAction("Ja!!!")).toBe("confirm");
    expect(parseReplyAction("Nein.")).toBe("cancel");
  });
});
