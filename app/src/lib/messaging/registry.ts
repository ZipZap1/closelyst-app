import { createFakeProvider, type FakeProvider } from "./fake-provider";
import { createMetaProvider, type MetaProvider } from "./meta-provider";
import type { InboundLogEntry, OutboundLogEntry, SendFailure, SendRequest, SendResult } from "./types";

export interface DemoProvider {
  readonly name: "fake" | "meta";
  send(req: SendRequest): Promise<SendResult | SendFailure>;
  snapshot(): { outbound: OutboundLogEntry[]; inbound: InboundLogEntry[] };
  reset(): void;
}

declare global {
  var __closelystMessagingProvider: DemoProvider | undefined;
}

function buildProvider(): DemoProvider {
  const choice = (process.env.MESSAGING_PROVIDER ?? "fake").toLowerCase();
  if (choice === "meta") {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    const appSecret = process.env.META_APP_SECRET;
    if (!phoneNumberId || !accessToken || !appSecret) {
      console.warn(
        "[messaging] MESSAGING_PROVIDER=meta but META_PHONE_NUMBER_ID / META_ACCESS_TOKEN / META_APP_SECRET missing — falling back to fake provider."
      );
      return createFakeProvider();
    }
    return createMetaProvider({
      phoneNumberId,
      accessToken,
      appSecret,
      apiVersion: process.env.META_GRAPH_API_VERSION,
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN
    });
  }
  return createFakeProvider();
}

export function getMessagingProvider(): DemoProvider {
  if (!globalThis.__closelystMessagingProvider) {
    globalThis.__closelystMessagingProvider = buildProvider();
  }
  return globalThis.__closelystMessagingProvider;
}

export function getMetaProvider(): MetaProvider | null {
  const p = getMessagingProvider();
  return p.name === "meta" ? (p as unknown as MetaProvider) : null;
}

export function getFakeProvider(): FakeProvider | null {
  const p = getMessagingProvider();
  return p.name === "fake" ? (p as unknown as FakeProvider) : null;
}
