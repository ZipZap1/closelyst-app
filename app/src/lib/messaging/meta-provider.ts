import { createHmac, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { parseReplyAction } from "./reply-parser";
import type {
  InboundLogEntry,
  InboundResult,
  MessagingProvider,
  OutboundLogEntry,
  SendFailure,
  SendRequest,
  SendResult
} from "./types";

const MAX_LOG = 100;
const DEFAULT_API_VERSION = "v21.0";

export interface MetaProviderConfig {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
  webhookVerifyToken?: string;
}

export interface MetaProvider extends MessagingProvider {
  readonly name: "meta";
  verifyWebhookSubscribe(params: URLSearchParams): string | null;
  verifyInboundSignature(rawBody: string, signatureHeader: string | null): boolean;
  handleInbound(rawBody: string, signatureHeader: string | null): InboundResult | { rejected: true; reason: string };
  snapshot(): { outbound: OutboundLogEntry[]; inbound: InboundLogEntry[] };
  reset(): void;
}

interface MetaState {
  outbound: OutboundLogEntry[];
  inbound: InboundLogEntry[];
}

function trim(list: unknown[]) {
  while (list.length > MAX_LOG) list.shift();
}

function digitsOnly(e164: string): string {
  return e164.replace(/^\+/, "").replace(/[^0-9]/g, "");
}

export function createMetaProvider(config: MetaProviderConfig): MetaProvider {
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const fetchImpl = config.fetchImpl ?? fetch;
  const state: MetaState = { outbound: [], inbound: [] };

  async function send(req: SendRequest): Promise<SendResult | SendFailure> {
    if (!req.to || !req.body) {
      return { ok: false, provider: "meta", error: "missing_to_or_body" };
    }
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: digitsOnly(req.to),
      type: "text",
      text: { body: req.body, preview_url: false }
    };
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      return {
        ok: false,
        provider: "meta",
        error: `network_error:${(err as Error).message}`
      };
    }
    let payload: any;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const code = payload?.error?.code ?? res.status;
      const msg = payload?.error?.message ?? "unknown";
      return { ok: false, provider: "meta", error: `meta_${code}:${msg}` };
    }
    const messageId = payload?.messages?.[0]?.id ?? `meta_${randomUUID()}`;
    const result: SendResult = {
      ok: true,
      provider: "meta",
      providerMessageId: messageId,
      channel: req.channel,
      to: req.to,
      sentAt: new Date().toISOString()
    };
    state.outbound.push({
      ...result,
      body: req.body,
      templateId: req.templateId,
      idempotencyKey: req.idempotencyKey
    });
    trim(state.outbound);
    return result;
  }

  function verifyWebhookSubscribe(params: URLSearchParams): string | null {
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");
    if (
      mode === "subscribe" &&
      config.webhookVerifyToken &&
      token === config.webhookVerifyToken &&
      challenge
    ) {
      return challenge;
    }
    return null;
  }

  function verifyInboundSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac("sha256", config.appSecret).update(rawBody).digest("hex");
    const provided = signatureHeader.replace(/^sha256=/i, "").trim();
    if (expected.length !== provided.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
    } catch {
      return false;
    }
  }

  function extractInboundEntries(payload: any): {
    from: string;
    body: string;
  }[] {
    const out: { from: string; body: string }[] = [];
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const messages = change?.value?.messages;
        if (!Array.isArray(messages)) continue;
        for (const m of messages) {
          const from = `+${m?.from ?? ""}`;
          let body = "";
          if (m?.type === "text") body = m.text?.body ?? "";
          else if (m?.type === "button") body = m.button?.text ?? "";
          else if (m?.type === "interactive") {
            body =
              m.interactive?.button_reply?.title ??
              m.interactive?.list_reply?.title ??
              "";
          }
          if (from && body) out.push({ from, body });
        }
      }
    }
    return out;
  }

  function handleInbound(
    rawBody: string,
    signatureHeader: string | null
  ): InboundResult | { rejected: true; reason: string } {
    if (!verifyInboundSignature(rawBody, signatureHeader)) {
      return { rejected: true, reason: "invalid_signature" };
    }
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { rejected: true, reason: "invalid_json" };
    }
    const messages = extractInboundEntries(payload);
    if (messages.length === 0) {
      return {
        accepted: true,
        eventId: `meta_${randomUUID()}`,
        normalizedAction: "noop",
        receivedAt: new Date().toISOString()
      };
    }
    let last: InboundResult | null = null;
    for (const m of messages) {
      const action = parseReplyAction(m.body);
      const result: InboundResult = {
        accepted: true,
        eventId: `meta_${randomUUID()}`,
        normalizedAction: action,
        receivedAt: new Date().toISOString()
      };
      state.inbound.push({
        ...result,
        from: m.from,
        channel: "whatsapp",
        body: m.body
      });
      trim(state.inbound);
      last = result;
    }
    return last!;
  }

  return {
    name: "meta",
    send,
    verifyWebhookSubscribe,
    verifyInboundSignature,
    handleInbound,
    snapshot() {
      return { outbound: state.outbound.slice(), inbound: state.inbound.slice() };
    },
    reset() {
      state.outbound.length = 0;
      state.inbound.length = 0;
    }
  };
}
