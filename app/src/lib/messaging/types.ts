export type MessagingChannel = "whatsapp" | "sms";
export type ReplyAction = "confirm" | "cancel" | "noop";

export interface SendRequest {
  to: string;
  channel: MessagingChannel;
  body: string;
  templateId?: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}

export interface SendResult {
  ok: true;
  provider: "fake";
  providerMessageId: string;
  channel: MessagingChannel;
  to: string;
  sentAt: string;
}

export interface SendFailure {
  ok: false;
  provider: "fake";
  error: string;
}

export interface InboundPayload {
  from: string;
  channel: MessagingChannel;
  body: string;
  receivedAt?: string;
  meta?: Record<string, unknown>;
}

export interface InboundResult {
  accepted: true;
  eventId: string;
  normalizedAction: ReplyAction;
  receivedAt: string;
}

export interface OutboundLogEntry extends SendResult {
  body: string;
  templateId?: string;
  idempotencyKey?: string;
}

export interface InboundLogEntry extends InboundResult {
  from: string;
  channel: MessagingChannel;
  body: string;
}

export interface MessagingProvider {
  readonly name: "fake";
  send(req: SendRequest): Promise<SendResult | SendFailure>;
}
