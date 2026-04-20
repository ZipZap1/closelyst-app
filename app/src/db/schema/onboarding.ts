import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { location, tenant } from "./tenancy";

export const tenantOnboarding = pgTable(
  "tenant_onboarding",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    currentStep: smallint("current_step").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    draftJson: jsonb("draft_json").notNull().default(sql`'{}'::jsonb`),
    bookingSource: text("booking_source"),
    bspVerificationHandle: text("bsp_verification_handle"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    stepRange: check("tenant_onboarding_step_range", sql`${t.currentStep} BETWEEN 1 AND 5`),
    activePerTenant: uniqueIndex("tenant_onboarding_active_uidx")
      .on(t.tenantId)
      .where(sql`${t.completedAt} IS NULL`)
  })
);

export const bookingSource = pgTable(
  "booking_source",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    adapter: text("adapter").notNull(),
    configJson: jsonb("config_json").notNull().default(sql`'{}'::jsonb`),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncCursor: text("last_sync_cursor"),
    lastSyncError: text("last_sync_error"),
    backfillDone: boolean("backfill_done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantLocationIdx: index("booking_source_tenant_location_idx").on(t.tenantId, t.locationId)
  })
);
