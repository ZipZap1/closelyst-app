import { randomUUID } from "node:crypto";
import type {
  InboundLogEntry,
  InboundPayload,
  InboundResult,
  MessagingProvider,
  OutboundLogEntry,
  SendFailure,
  SendRequest,
  SendResult
} from "./types";
import { parseReplyAction } from "./reply-parser";

const MAX_LOG = 100;

export interface FakeMessagingState {
  outbound: OutboundLogEntry[];
  inbound: InboundLogEntry[];
  idempotencyIndex: Map<string, OutboundLogEntry>;
}

export function createFakeState(): FakeMessagingState {
  return { outbound: [], inbound: [], idempotencyIndex: new Map() };
}

export interface FakeProvider extends MessagingProvider {
  handleInbound(payload: InboundPayload): InboundResult;
  snapshot(): { outbound: OutboundLogEntry[]; inbound: InboundLogEntry[] };
  reset(): void;
}

export function createFakeProvider(state: FakeMessagingState = createFakeState()): FakeProvider {
  function trim(list: unknown[]) {
    while (list.length > MAX_LOG) list.shift();
  }

  return {
    name: "fake",
    async send(req: SendRequest): Promise<SendResult | SendFailure> {
      if (!req.to || !req.body) {
        return { ok: false, provider: "fake", error: "missing_to_or_body" };
      }
      if (req.idempotencyKey) {
        const existing = state.idempotencyIndex.get(req.idempotencyKey);
        if (existing) return existing;
      }
      const result: SendResult = {
        ok: true,
        provider: "fake",
        providerMessageId: `fake_${randomUUID()}`,
        channel: req.channel,
        to: req.to,
        sentAt: new Date().toISOString()
      };
      const entry: OutboundLogEntry = {
        ...result,
        body: req.body,
        templateId: req.templateId,
        idempotencyKey: req.idempotencyKey
      };
      state.outbound.push(entry);
      trim(state.outbound);
      if (req.idempotencyKey) state.idempotencyIndex.set(req.idempotencyKey, entry);
      return result;
    },
    handleInbound(payload: InboundPayload): InboundResult {
      const receivedAt = payload.receivedAt ?? new Date().toISOString();
      const normalizedAction = parseReplyAction(payload.body);
      const result: InboundResult = {
        accepted: true,
        eventId: `inbound_${randomUUID()}`,
        normalizedAction,
        receivedAt
      };
      const entry: InboundLogEntry = {
        ...result,
        from: payload.from,
        channel: payload.channel,
        body: payload.body
      };
      state.inbound.push(entry);
      trim(state.inbound);
      return result;
    },
    snapshot() {
      return {
        outbound: state.outbound.slice(),
        inbound: state.inbound.slice()
      };
    },
    reset() {
      state.outbound.length = 0;
      state.inbound.length = 0;
      state.idempotencyIndex.clear();
    }
  };
}
