import { pgEnum } from "drizzle-orm/pg-core";

export const bookingStatus = pgEnum("booking_status", [
  "scheduled",
  "confirmed",
  "cancelled",
  "no_show",
  "completed"
]);

export const reminderChannel = pgEnum("reminder_channel", ["whatsapp", "sms"]);

export const reminderStatus = pgEnum("reminder_status", [
  "pending",
  "sending",
  "sent",
  "failed",
  "cancelled"
]);

export const reminderWindow = pgEnum("reminder_window", ["t_24h", "t_2h", "custom"]);

export const replyAction = pgEnum("reply_action", ["confirm", "cancel", "noop"]);

export const localeCode = pgEnum("locale_code", ["de", "en"]);

export const staffRole = pgEnum("staff_role", ["owner", "manager", "staff"]);
