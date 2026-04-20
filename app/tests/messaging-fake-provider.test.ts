import { describe, expect, it } from "vitest";
import { createFakeProvider } from "../src/lib/messaging/fake-provider";

describe("fake messaging provider", () => {
  it("send records an outbound entry and returns a provider message id", async () => {
    const p = createFakeProvider();
    const res = await p.send({
      to: "+491751234567",
      channel: "whatsapp",
      body: "Reminder: morgen 10:00"
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.provider).toBe("fake");
    expect(res.providerMessageId.startsWith("fake_")).toBe(true);
    const snap = p.snapshot();
    expect(snap.outbound).toHaveLength(1);
    expect(snap.outbound[0]!.body).toBe("Reminder: morgen 10:00");
  });

  it("send rejects empty to/body", async () => {
    const p = createFakeProvider();
    const res = await p.send({ to: "", channel: "sms", body: "x" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe("missing_to_or_body");
  });

  it("send is idempotent on idempotencyKey", async () => {
    const p = createFakeProvider();
    const a = await p.send({
      to: "+491751234567",
      channel: "whatsapp",
      body: "dup",
      idempotencyKey: "k1"
    });
    const b = await p.send({
      to: "+491751234567",
      channel: "whatsapp",
      body: "dup",
      idempotencyKey: "k1"
    });
    expect(a.ok && b.ok && a.ok === b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.providerMessageId).toBe(b.providerMessageId);
    }
    expect(p.snapshot().outbound).toHaveLength(1);
  });

  it("handleInbound normalizes JA/NEIN replies", () => {
    const p = createFakeProvider();
    const a = p.handleInbound({ from: "+491751234567", channel: "whatsapp", body: "Ja!" });
    const b = p.handleInbound({ from: "+491751234567", channel: "whatsapp", body: "nein" });
    const c = p.handleInbound({ from: "+491751234567", channel: "sms", body: "Danke" });
    expect(a.normalizedAction).toBe("confirm");
    expect(b.normalizedAction).toBe("cancel");
    expect(c.normalizedAction).toBe("noop");
    expect(p.snapshot().inbound).toHaveLength(3);
  });

  it("reset clears outbound and inbound logs", async () => {
    const p = createFakeProvider();
    await p.send({ to: "+491751234567", channel: "whatsapp", body: "hi" });
    p.handleInbound({ from: "+491751234567", channel: "whatsapp", body: "ja" });
    p.reset();
    const snap = p.snapshot();
    expect(snap.outbound).toHaveLength(0);
    expect(snap.inbound).toHaveLength(0);
  });
});
