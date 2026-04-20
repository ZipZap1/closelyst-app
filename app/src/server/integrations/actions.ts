"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "../../db/client";
import { bookingSource } from "../../db/schema";
import { runSync } from "../../booking/sync";
import { readOnboardingCookie } from "../onboarding/session";

function windowNow(): { from: Date; to: Date } {
  const from = new Date();
  const to = new Date(from.getTime() + 1000 * 60 * 60 * 24 * 14);
  return { from, to };
}

export async function syncNowAction(sourceId: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  const session = await readOnboardingCookie();
  if (!session) return { ok: false, message: "No active session" };
  try {
    await runSync(session.tenantId, sourceId, windowNow());
    revalidatePath("/app/settings/integrations");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function disconnectAction(sourceId: string): Promise<{ ok: boolean }> {
  const session = await readOnboardingCookie();
  if (!session) return { ok: false };
  await withTenant(session.tenantId, async (tx) => {
    await tx.delete(bookingSource).where(eq(bookingSource.id, sourceId));
  });
  revalidatePath("/app/settings/integrations");
  return { ok: true };
}
