import { and, eq, isNull } from "drizzle-orm";
import { withTenant } from "../db/client";
import { booking, bookingSource, customer } from "../db/schema";
import { getAdapter } from "./index";
import type { NormalizedBooking, PullWindow } from "./types";

export interface SyncOutcome {
  created: number;
  updated: number;
  skipped: number;
  cursor?: string;
}

export interface BookingSnapshot {
  scheduledAt: Date;
  durationMinutes: number;
  customerId: string;
}

/**
 * Pure decision of whether an incoming pull diffs against the stored booking.
 * Exported so the upsert idempotency contract is unit-testable without a DB.
 */
export function diffBooking(
  existing: BookingSnapshot | null,
  incoming: { scheduledAt: Date; durationMinutes: number; customerId: string }
): "create" | "update" | "skip" {
  if (!existing) return "create";
  const sameTime = existing.scheduledAt.getTime() === incoming.scheduledAt.getTime();
  const sameDuration = existing.durationMinutes === incoming.durationMinutes;
  const sameCustomer = existing.customerId === incoming.customerId;
  if (sameTime && sameDuration && sameCustomer) return "skip";
  return "update";
}

/**
 * Upserts via (tenant_id, external_id) so re-runs converge without duplicates.
 */
export async function runSync(
  tenantId: string,
  sourceId: string,
  window: PullWindow
): Promise<SyncOutcome> {
  return withTenant(tenantId, async (tx) => {
    const source = await tx.query.bookingSource.findFirst({
      where: eq(bookingSource.id, sourceId)
    });
    if (!source) throw new Error(`booking_source ${sourceId} not found for tenant`);
    const adapter = getAdapter(source.adapter as "manual" | "csv" | "ical");
    const config = adapter.validateConfig(source.configJson);
    const cursorBefore = source.lastSyncCursor ?? undefined;
    const result = await adapter.pullWindow(config, window, cursorBefore);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const item of result.bookings) {
      const outcome = await upsertBooking(tx, tenantId, source.locationId, item);
      if (outcome === "created") created++;
      else if (outcome === "updated") updated++;
      else skipped++;
    }
    const update: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      lastSyncError: null,
      backfillDone: true
    };
    if (result.cursor !== undefined) update.lastSyncCursor = result.cursor;
    await tx.update(bookingSource).set(update).where(eq(bookingSource.id, sourceId));
    const outcome: SyncOutcome = { created, updated, skipped };
    if (result.cursor) outcome.cursor = result.cursor;
    return outcome;
  });
}

type Tx = Parameters<Parameters<typeof withTenant<unknown>>[1]>[0];

async function upsertBooking(
  tx: Tx,
  tenantId: string,
  locationId: string,
  item: NormalizedBooking
): Promise<"created" | "updated" | "skipped"> {
  const existingCustomer = await tx.query.customer.findFirst({
    where: and(
      eq(customer.tenantId, tenantId),
      eq(customer.phoneE164, item.customerPhoneE164),
      isNull(customer.deletedAt)
    )
  });
  let custId: string;
  if (existingCustomer) {
    custId = existingCustomer.id;
    if (existingCustomer.fullName !== item.customerFullName) {
      await tx
        .update(customer)
        .set({ fullName: item.customerFullName, updatedAt: new Date() })
        .where(eq(customer.id, custId));
    }
  } else {
    const inserted = await tx
      .insert(customer)
      .values({
        tenantId,
        fullName: item.customerFullName,
        phoneE164: item.customerPhoneE164
      })
      .returning({ id: customer.id });
    if (!inserted[0]) return "skipped";
    custId = inserted[0].id;
  }

  const existing = await tx.query.booking.findFirst({
    where: and(eq(booking.tenantId, tenantId), eq(booking.externalId, item.externalId))
  });
  if (!existing) {
    await tx.insert(booking).values({
      tenantId,
      locationId,
      customerId: custId,
      scheduledAt: item.scheduledAt,
      durationMinutes: item.durationMinutes,
      source: "sync",
      externalId: item.externalId,
      notes: item.notes ?? null
    });
    return "created";
  }
  const sameTime = existing.scheduledAt.getTime() === item.scheduledAt.getTime();
  const sameDuration = existing.durationMinutes === item.durationMinutes;
  if (sameTime && sameDuration && existing.customerId === custId) return "skipped";
  await tx
    .update(booking)
    .set({
      scheduledAt: item.scheduledAt,
      durationMinutes: item.durationMinutes,
      customerId: custId,
      notes: item.notes ?? existing.notes,
      updatedAt: new Date()
    })
    .where(eq(booking.id, existing.id));
  return "updated";
}
