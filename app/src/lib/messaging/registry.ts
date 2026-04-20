import { createFakeProvider, type FakeProvider } from "./fake-provider";

declare global {
  var __machDasMalMessagingProvider: FakeProvider | undefined;
}

export function getMessagingProvider(): FakeProvider {
  if (!globalThis.__machDasMalMessagingProvider) {
    globalThis.__machDasMalMessagingProvider = createFakeProvider();
  }
  return globalThis.__machDasMalMessagingProvider;
}
