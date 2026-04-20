import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { booking } from "./bookings";
import { reminderChannel, reminderStatus, reminderWindow, replyAction } from "./enums";
import { customer, location, tenant } from "./tenancy";

export const reminder = pgTable(
  "reminder",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    channel: reminderChannel("channel").notNull(),
    sendWindow: reminderWindow("send_window").notNull(),
    scheduledSendAt: timestamp("scheduled_send_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: reminderStatus("status").notNull().default("pending"),
    templateId: text("template_id").notNull(),
    templateParamsJson: jsonb("template_params_json").notNull().default(sql`'{}'::jsonb`),
    providerMessageId: text("provider_message_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    lastError: text("last_error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    uniqueWindow: uniqueIndex("reminder_booking_window_uidx").on(
      t.tenantId,
      t.bookingId,
      t.channel,
      t.sendWindow
    ),
    idempotencyUnique: uniqueIndex("reminder_idempotency_uidx").on(t.idempotencyKey),
    pendingPoll: index("reminder_pending_poll_idx")
      .on(t.status, t.scheduledSendAt)
      .where(sql`${t.status} = 'pending'`),
    providerMessageIdx: index("reminder_provider_message_idx")
      .on(t.providerMessageId)
      .where(sql`${t.providerMessageId} is not null`)
  })
);

export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    requestedWindowStart: timestamp("requested_window_start", { withTimezone: true }).notNull(),
    requestedWindowEnd: timestamp("requested_window_end", { withTimezone: true }).notNull(),
    priority: integer("priority").notNull().default(0),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    fulfilledBookingId: uuid("fulfilled_booking_id").references(() => booking.id, {
      onDelete: "set null"
    }),
    status: text("status").notNull().default("waiting"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    matchIdx: index("waitlist_match_idx").on(
      t.tenantId,
      t.locationId,
      t.status,
      t.priority,
      t.createdAt
    )
  })
);

export const replyEvent = pgTable(
  "reply_event",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => booking.id, { onDelete: "cascade" }),
    reminderId: uuid("reminder_id").references(() => reminder.id, { onDelete: "set null" }),
    channel: reminderChannel("channel").notNull(),
    fromPhoneE164: text("from_phone_e164").notNull(),
    rawPayloadJson: jsonb("raw_payload_json").notNull(),
    normalizedAction: replyAction("normalized_action").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true })
  },
  (t) => ({
    tenantReceivedIdx: index("reply_event_tenant_received_idx").on(t.tenantId, t.receivedAt),
    tenantBookingIdx: index("reply_event_tenant_booking_idx").on(t.tenantId, t.bookingId)
  })
);
