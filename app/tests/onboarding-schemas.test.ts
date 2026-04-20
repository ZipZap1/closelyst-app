import { describe, expect, it } from "vitest";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema
} from "../src/server/onboarding/schemas";

describe("onboarding step schemas", () => {
  it("step1 requires dpaAck when industry=clinic", () => {
    const result = step1Schema.safeParse({
      tenantName: "Praxis Berlin",
      billingEmail: "ops@praxis.de",
      industry: "clinic",
      dpaAck: false
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["dpaAck"]);
    }
  });

  it("step1 accepts salon without dpaAck", () => {
    const result = step1Schema.safeParse({
      tenantName: "Salon Hair",
      billingEmail: "hi@salon.de",
      industry: "salon",
      dpaAck: false
    });
    expect(result.success).toBe(true);
  });

  it("step1 rejects invalid email", () => {
    const result = step1Schema.safeParse({
      tenantName: "X",
      billingEmail: "not-an-email",
      industry: "other",
      dpaAck: true
    });
    expect(result.success).toBe(false);
  });

  it("step2 defaults timezone", () => {
    const result = step2Schema.safeParse({
      locationName: "Prenzlauer Berg",
      ownerName: "Nadia",
      ownerEmail: "nadia@salon.de"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe("Europe/Berlin");
    }
  });

  it("step3 discriminated union rejects csv without data", () => {
    const result = step3Schema.safeParse({ kind: "csv" });
    expect(result.success).toBe(false);
  });

  it("step3 accepts ical with URL", () => {
    const result = step3Schema.safeParse({ kind: "ical", feedUrl: "https://cal.example.com/f.ics" });
    expect(result.success).toBe(true);
  });

  it("step3 rejects ical with non-URL string", () => {
    const result = step3Schema.safeParse({ kind: "ical", feedUrl: "not a url" });
    expect(result.success).toBe(false);
  });

  it("step5 defaults all booleans", () => {
    const result = step5Schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        window24h: true,
        window2h: true,
        preferWhatsapp: true,
        waitlistEnabled: true
      });
    }
  });
});
