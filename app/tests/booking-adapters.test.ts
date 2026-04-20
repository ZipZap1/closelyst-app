import { describe, expect, it } from "vitest";
import { csvAdapter } from "../src/booking/adapters/csv";
import { icalAdapter } from "../src/booking/adapters/ical";
import { manualAdapter } from "../src/booking/adapters/manual";
import { getAdapter } from "../src/booking";

const window14d = {
  from: new Date("2026-04-20T00:00:00Z"),
  to: new Date("2026-05-04T00:00:00Z")
};

describe("manual adapter", () => {
  it("pullWindow returns empty", async () => {
    const result = await manualAdapter.pullWindow({}, window14d);
    expect(result.bookings).toEqual([]);
  });
});

describe("csv adapter", () => {
  it("parses a row inside the window", async () => {
    const config = csvAdapter.validateConfig({
      data: [
        "external_id,scheduled_at,duration_minutes,customer_full_name,customer_phone_e164,notes",
        "ext-1,2026-04-22T10:00:00Z,30,Anna Schmidt,+4915112345678,first visit"
      ].join("\n")
    });
    const result = await csvAdapter.pullWindow(config, window14d);
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]).toMatchObject({
      externalId: "ext-1",
      durationMinutes: 30,
      customerFullName: "Anna Schmidt",
      customerPhoneE164: "+4915112345678"
    });
  });

  it("skips rows outside the window", async () => {
    const config = csvAdapter.validateConfig({
      data: [
        "external_id,scheduled_at,duration_minutes,customer_full_name,customer_phone_e164",
        "ext-2,2025-01-01T10:00:00Z,30,Anna,+4915100000000"
      ].join("\n")
    });
    const result = await csvAdapter.pullWindow(config, window14d);
    expect(result.bookings).toEqual([]);
  });

  it("throws on missing required columns", async () => {
    const config = csvAdapter.validateConfig({
      data: "external_id,scheduled_at\nx,2026-04-22T10:00:00Z"
    });
    await expect(csvAdapter.pullWindow(config, window14d)).rejects.toThrow(/missing required/);
  });
});

describe("ical adapter", () => {
  const feed = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//test//",
    "BEGIN:VEVENT",
    "UID:evt-1@test",
    "SUMMARY:Anna — Haircut",
    "DTSTART:20260422T100000Z",
    "DTEND:20260422T104500Z",
    "DESCRIPTION:phone: +4915112345678",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:evt-stale@test",
    "SUMMARY:Outside",
    "DTSTART:20250101T100000Z",
    "DTEND:20250101T110000Z",
    "DESCRIPTION:+4915100000000",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  it("returns events inside the window with derived duration", async () => {
    const config = icalAdapter.validateConfig({ feedBody: feed });
    const result = await icalAdapter.pullWindow(config, window14d);
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]).toMatchObject({
      externalId: "evt-1@test",
      durationMinutes: 45,
      customerPhoneE164: "+4915112345678",
      customerFullName: "Anna — Haircut"
    });
    expect(result.cursor).toBeDefined();
  });

  it("skips events without a phone number", async () => {
    const noPhoneFeed = feed.replace("DESCRIPTION:phone: +4915112345678", "DESCRIPTION:no phone");
    const config = icalAdapter.validateConfig({ feedBody: noPhoneFeed });
    const result = await icalAdapter.pullWindow(config, window14d);
    expect(result.bookings).toHaveLength(0);
  });
});

describe("adapter registry", () => {
  it("returns the correct adapter for each kind", () => {
    expect(getAdapter("manual").kind).toBe("manual");
    expect(getAdapter("csv").kind).toBe("csv");
    expect(getAdapter("ical").kind).toBe("ical");
  });

  it("refuses to return an adapter for later", () => {
    expect(() => getAdapter("later")).toThrow(/not a real adapter/);
  });
});
