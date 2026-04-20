import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createMetaProvider } from "../src/lib/messaging/meta-provider";

const baseConfig = {
  phoneNumberId: "1130220486836062",
  accessToken: "test-token",
  appSecret: "test-secret",
  apiVersion: "v21.0",
  webhookVerifyToken: "verify-me"
};

function mockFetchOk(body: any): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  ) as unknown as typeof fetch;
}

function mockFetchError(status: number, body: any): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    })
  ) as unknown as typeof fetch;
}

describe("MetaProvider.send", () => {
  it("posts to graph.facebook.com and records outbound on success", async () => {
    const fetchImpl = mockFetchOk({
      messaging_product: "whatsapp",
      contacts: [{ input: "491751234567", wa_id: "491751234567" }],
      messages: [{ id: "wamid.HBgN..." }]
    });
    const p = createMetaProvider({ ...baseConfig, fetchImpl });
    const res = await p.send({
      to: "+491751234567",
      channel: "whatsapp",
      body: "hi"
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.provider).toBe("meta");
    expect(res.providerMessageId).toBe("wamid.HBgN...");
    expect(p.snapshot().outbound).toHaveLength(1);

    const call = (fetchImpl as any).mock.calls[0];
    expect(call[0]).toBe("https://graph.facebook.com/v21.0/1130220486836062/messages");
    const body = JSON.parse(call[1].body);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("491751234567"); // digits only, no +
    expect(call[1].headers.Authorization).toBe("Bearer test-token");
  });

  it("returns failure with meta error code on non-2xx", async () => {
    const fetchImpl = mockFetchError(400, {
      error: { code: 131009, message: "Parameter value is not valid" }
    });
    const p = createMetaProvider({ ...baseConfig, fetchImpl });
    const res = await p.send({
      to: "+491751234567",
      channel: "whatsapp",
      body: "hi"
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.provider).toBe("meta");
    expect(res.error).toContain("meta_131009");
  });

  it("returns failure for empty to/body", async () => {
    const fetchImpl = vi.fn();
    const p = createMetaProvider({ ...baseConfig, fetchImpl: fetchImpl as unknown as typeof fetch });
    const res = await p.send({ to: "", channel: "whatsapp", body: "x" });
    expect(res.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("MetaProvider.verifyWebhookSubscribe", () => {
  it("returns the challenge on matching token", () => {
    const p = createMetaProvider({ ...baseConfig, fetchImpl: mockFetchOk({}) });
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-me",
      "hub.challenge": "abc123"
    });
    expect(p.verifyWebhookSubscribe(params)).toBe("abc123");
  });

  it("returns null on token mismatch", () => {
    const p = createMetaProvider({ ...baseConfig, fetchImpl: mockFetchOk({}) });
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong",
      "hub.challenge": "abc123"
    });
    expect(p.verifyWebhookSubscribe(params)).toBeNull();
  });
});

describe("MetaProvider.handleInbound", () => {
  function sign(body: string, secret = "test-secret") {
    return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  }

  it("rejects when signature missing or wrong", () => {
    const p = createMetaProvider({ ...baseConfig, fetchImpl: mockFetchOk({}) });
    const body = JSON.stringify({ entry: [] });
    expect(p.handleInbound(body, null)).toEqual({
      rejected: true,
      reason: "invalid_signature"
    });
    expect(p.handleInbound(body, "sha256=" + "0".repeat(64))).toEqual({
      rejected: true,
      reason: "invalid_signature"
    });
  });

  it("accepts valid signature, parses messages, normalizes JA/NEIN", () => {
    const p = createMetaProvider({ ...baseConfig, fetchImpl: mockFetchOk({}) });
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                messages: [
                  { from: "491751234567", id: "wamid.A", type: "text", text: { body: "Ja bitte" } }
                ]
              }
            }
          ]
        }
      ]
    };
    const body = JSON.stringify(payload);
    const result = p.handleInbound(body, sign(body));
    expect("accepted" in result && result.accepted).toBe(true);
    if (!("accepted" in result)) return;
    expect(result.normalizedAction).toBe("confirm");
    const snap = p.snapshot();
    expect(snap.inbound).toHaveLength(1);
    expect(snap.inbound[0]!.from).toBe("+491751234567");
  });

  it("treats empty entry list as noop", () => {
    const p = createMetaProvider({ ...baseConfig, fetchImpl: mockFetchOk({}) });
    const body = JSON.stringify({ entry: [] });
    const result = p.handleInbound(body, sign(body));
    expect("accepted" in result && result.accepted).toBe(true);
    if (!("accepted" in result)) return;
    expect(result.normalizedAction).toBe("noop");
  });
});
