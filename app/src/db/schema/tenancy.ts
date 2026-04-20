import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { localeCode, staffRole } from "./enums";

const citext = customType<{ data: string }>({
  dataType: () => "citext"
});

export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  billingEmail: citext("billing_email").notNull(),
  locale: localeCode("locale").notNull().default("de"),
  subscriptionStatus: text("subscription_status").notNull().default("trialing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const location = pgTable(
  "location",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    addressJson: jsonb("address_json"),
    whatsappNumber: text("whatsapp_number"),
    smsSenderId: text("sms_sender_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantIdx: index("location_tenant_idx").on(t.tenantId)
  })
);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    authUserId: uuid("auth_user_id").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: staffRole("role").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantLocationIdx: index("staff_tenant_location_idx").on(t.tenantId, t.locationId)
  })
);

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phoneE164: text("phone_e164").notNull(),
    email: citext("email"),
    locale: localeCode("locale").notNull().default("de"),
    consentWhatsapp: boolean("consent_whatsapp").notNull().default(false),
    consentSms: boolean("consent_sms").notNull().default(false),
    consentRecordedAt: timestamp("consent_recorded_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    tenantIdx: index("customer_tenant_idx").on(t.tenantId),
    phoneUnique: uniqueIndex("customer_tenant_phone_uidx")
      .on(t.tenantId, t.phoneE164)
      .where(sql`${t.deletedAt} is null`)
  })
);
