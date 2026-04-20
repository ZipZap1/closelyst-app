import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { bookingStatus } from "./enums";
import { customer, location, staff, tenant } from "./tenancy";

export const booking = pgTable(
  "booking",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: bookingStatus("status").notNull().default("scheduled"),
    source: text("source").notNull().default("manual"),
    externalId: text("external_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    tenantScheduleIdx: index("booking_tenant_scheduled_idx").on(t.tenantId, t.scheduledAt),
    tenantLocationScheduleIdx: index("booking_tenant_location_scheduled_idx").on(
      t.tenantId,
      t.locationId,
      t.scheduledAt
    ),
    externalIdUnique: uniqueIndex("booking_tenant_external_uidx")
      .on(t.tenantId, t.externalId)
      .where(sql`${t.externalId} is not null`),
    durationCheck: check("booking_duration_positive", sql`${t.durationMinutes} > 0`)
  })
);
