import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale="de" messages={messages}>
      <main style={{ maxWidth: 560, margin: "2rem auto", padding: "1rem" }}>{children}</main>
    </NextIntlClientProvider>
  );
}
