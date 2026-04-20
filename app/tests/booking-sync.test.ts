import { describe, expect, it } from "vitest";
import { diffBooking } from "../src/booking/sync";

const base = {
  scheduledAt: new Date("2026-04-22T10:00:00Z"),
  durationMinutes: 30,
  customerId: "cust-1"
};

describe("diffBooking (pullWindow upsert semantics)", () => {
  it("creates when no existing row", () => {
    expect(diffBooking(null, base)).toBe("create");
  });

  it("skips when all fields match", () => {
    expect(diffBooking({ ...base }, base)).toBe("skip");
  });

  it("updates when scheduledAt differs", () => {
    expect(
      diffBooking(
        { ...base, scheduledAt: new Date("2026-04-22T11:00:00Z") },
        base
      )
    ).toBe("update");
  });

  it("updates when durationMinutes differs", () => {
    expect(diffBooking({ ...base, durationMinutes: 45 }, base)).toBe("update");
  });

  it("updates when customerId differs (phone-number collision, different customer)", () => {
    expect(diffBooking({ ...base, customerId: "cust-2" }, base)).toBe("update");
  });
});
