import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { withTenant } from "../../../../db/client";
import { bookingSource, location } from "../../../../db/schema";
import { readOnboardingCookie } from "../../../../server/onboarding/session";
import { IntegrationsList, type IntegrationRow } from "./integrations-list";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await readOnboardingCookie();
  if (!session) redirect("/onboarding/step-1");
  const messages = await getMessages();
  const rows = await withTenant<IntegrationRow[]>(session.tenantId, async (tx) => {
    const sources = await tx.select().from(bookingSource);
    const locations = await tx.select().from(location);
    const locMap = new Map(locations.map((l) => [l.id, l.name] as const));
    return sources.map((s) => ({
      id: s.id,
      adapter: s.adapter,
      locationName: locMap.get(s.locationId) ?? s.locationId,
      lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
      lastError: s.lastSyncError ?? null
    }));
  });
  return (
    <NextIntlClientProvider locale="de" messages={messages}>
      <main style={{ maxWidth: 720, margin: "2rem auto", padding: "1rem" }}>
        <IntegrationsList rows={rows} />
      </main>
    </NextIntlClientProvider>
  );
}
