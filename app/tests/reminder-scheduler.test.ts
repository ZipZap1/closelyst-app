import { describe, expect, it } from "vitest";
import { createFakeProvider } from "../src/lib/messaging/fake-provider";
import { createScheduler } from "../src/lib/reminders/scheduler";

const BASE_TENANT = "11111111-1111-1111-1111-111111111111";

function booking(id: string, offsetMs: number) {
  return {
    id,
    tenantId: BASE_TENANT,
    locationName: "Salon Alpha",
    customerName: "Anna",
    customerPhoneE164: "+491751234567",
    scheduledAt: new Date(Date.now() + offsetMs).toISOString()
  };
}

describe("reminder scheduler", () => {
  it("enqueues T-24h and T-2h for a future booking", () => {
    const s = createScheduler();
    const res = s.enqueueForBooking(booking("bk1", 48 * 60 * 60 * 1000));
    expect(res.enqueued).toHaveLength(2);
    expect(res.enqueued.map((r) => r.window).sort()).toEqual(["t_24h", "t_2h"]);
    expect(res.skipped).toHaveLength(0);
    expect(s.snapshot().reminders).toHaveLength(2);
  });

  it("skips a window whose send time is already in the past", () => {
    const s = createScheduler();
    const res = s.enqueueForBooking(booking("bk2", 3 * 60 * 60 * 1000));
    expect(res.enqueued.map((r) => r.window)).toEqual(["t_2h"]);
    expect(res.skipped.map((x) => x.window)).toEqual(["t_24h"]);
  });

  it("is idempotent: re-enqueuing the same booking skips duplicates", () => {
    const s = createScheduler();
    s.enqueueForBooking(booking("bk3", 48 * 60 * 60 * 1000));
    const second = s.enqueueForBooking(booking("bk3", 48 * 60 * 60 * 1000));
    expect(second.enqueued).toHaveLength(0);
    expect(second.skipped.every((x) => x.reason === "duplicate")).toBe(true);
    expect(s.snapshot().reminders).toHaveLength(2);
  });

  it("dueReminders returns only pending reminders at/before now", () => {
    const s = createScheduler();
    const b = booking("bk4", 25 * 60 * 60 * 1000);
    s.enqueueForBooking(b);
    const dueNow = s.dueReminders(new Date());
    expect(dueNow).toHaveLength(0);
    const dueLater = s.dueReminders(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(dueLater).toHaveLength(1);
    expect(dueLater[0]!.window).toBe("t_24h");
  });

  it("processDue sends pending reminders and marks them sent", async () => {
    const s = createScheduler();
    const provider = createFakeProvider();
    const b = booking("bk5", 25 * 60 * 60 * 1000);
    s.enqueueForBooking(b);
    const fireAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const res = await s.processDue({ provider, now: fireAt });
    expect(res.attempted).toBe(1);
    expect(res.sent).toBe(1);
    expect(res.failed).toBe(0);
    const snap = s.snapshot();
    expect(snap.reminders.filter((r) => r.status === "sent")).toHaveLength(1);
    expect(provider.snapshot().outbound).toHaveLength(1);
  });

  it("cancelForBooking marks remaining pending reminders cancelled", () => {
    const s = createScheduler();
    s.enqueueForBooking(booking("bk6", 48 * 60 * 60 * 1000));
    const res = s.cancelForBooking("bk6");
    expect(res.cancelled).toBe(2);
    expect(s.snapshot().reminders.every((r) => r.status === "cancelled")).toBe(true);
  });

  it("templates are DE and include customer name + location", () => {
    const s = createScheduler();
    const { enqueued } = s.enqueueForBooking(booking("bk7", 48 * 60 * 60 * 1000));
    for (const r of enqueued) {
      expect(r.body).toContain("Anna");
      expect(r.body).toContain("Salon Alpha");
      expect(r.body).toMatch(/JA|NEIN/);
    }
  });
});
