import { randomUUID } from "node:crypto";
import type {
  MessagingChannel,
  MessagingProvider,
  SendFailure,
  SendResult
} from "../messaging/types";

export type ReminderWindow = "t_24h" | "t_2h";
export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";

export interface BookingInput {
  id: string;
  tenantId: string;
  locationId?: string;
  locationName?: string;
  customerId?: string;
  customerName?: string;
  customerPhoneE164: string;
  scheduledAt: string;
  channel?: MessagingChannel;
}

export interface ScheduledReminder {
  id: string;
  bookingId: string;
  tenantId: string;
  channel: MessagingChannel;
  window: ReminderWindow;
  scheduledSendAt: string;
  status: ReminderStatus;
  templateId: string;
  to: string;
  body: string;
  idempotencyKey: string;
  createdAt: string;
  sentAt?: string;
  providerMessageId?: string;
  lastError?: string;
  attempts: number;
}

export interface EnqueueResult {
  bookingId: string;
  enqueued: ScheduledReminder[];
  skipped: { window: ReminderWindow; reason: "past_due" | "duplicate" }[];
}

export interface ProcessResult {
  now: string;
  attempted: number;
  sent: number;
  failed: number;
  reminders: ScheduledReminder[];
}

const WINDOW_OFFSETS_MS: Record<ReminderWindow, number> = {
  t_24h: 24 * 60 * 60 * 1000,
  t_2h: 2 * 60 * 60 * 1000
};

const TEMPLATES: Record<ReminderWindow, string> = {
  t_24h: "reminder_t24h_de",
  t_2h: "reminder_t2h_de"
};

function renderBody(booking: BookingInput, window: ReminderWindow): string {
  const name = booking.customerName ?? "Kunde/Kundin";
  const loc = booking.locationName ?? "unser Standort";
  const when = new Date(booking.scheduledAt).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  if (window === "t_24h") {
    return `Hallo ${name}, Erinnerung: Termin am ${when} bei ${loc}. Antworte JA zur Bestätigung oder NEIN zum Absagen.`;
  }
  return `Hallo ${name}, Ihr Termin um ${when} bei ${loc} beginnt in ca. 2 Stunden. JA bestätigt, NEIN sagt ab.`;
}

export interface SchedulerState {
  reminders: Map<string, ScheduledReminder>;
  byBooking: Map<string, Set<string>>;
  idempotencyIndex: Map<string, string>;
}

export function createSchedulerState(): SchedulerState {
  return { reminders: new Map(), byBooking: new Map(), idempotencyIndex: new Map() };
}

export interface ReminderScheduler {
  enqueueForBooking(booking: BookingInput, now?: Date): EnqueueResult;
  cancelForBooking(bookingId: string, reason?: string): { cancelled: number };
  dueReminders(now?: Date): ScheduledReminder[];
  processDue(opts: { provider: MessagingProvider; now?: Date }): Promise<ProcessResult>;
  snapshot(): { reminders: ScheduledReminder[] };
  listByBooking(bookingId: string): ScheduledReminder[];
  reset(): void;
}

export function createScheduler(state: SchedulerState = createSchedulerState()): ReminderScheduler {
  function recordFor(bookingId: string): Set<string> {
    let set = state.byBooking.get(bookingId);
    if (!set) {
      set = new Set();
      state.byBooking.set(bookingId, set);
    }
    return set;
  }

  function allReminders(): ScheduledReminder[] {
    return Array.from(state.reminders.values());
  }

  return {
    enqueueForBooking(booking, now = new Date()) {
      const channel: MessagingChannel = booking.channel ?? "whatsapp";
      const bookingAt = new Date(booking.scheduledAt).getTime();
      const enqueued: ScheduledReminder[] = [];
      const skipped: EnqueueResult["skipped"] = [];
      for (const window of ["t_24h", "t_2h"] as ReminderWindow[]) {
        const idempotencyKey = `${booking.tenantId}:${booking.id}:${channel}:${window}`;
        if (state.idempotencyIndex.has(idempotencyKey)) {
          skipped.push({ window, reason: "duplicate" });
          continue;
        }
        const sendAtMs = bookingAt - WINDOW_OFFSETS_MS[window];
        if (sendAtMs < now.getTime()) {
          skipped.push({ window, reason: "past_due" });
          continue;
        }
        const reminder: ScheduledReminder = {
          id: randomUUID(),
          bookingId: booking.id,
          tenantId: booking.tenantId,
          channel,
          window,
          scheduledSendAt: new Date(sendAtMs).toISOString(),
          status: "pending",
          templateId: TEMPLATES[window],
          to: booking.customerPhoneE164,
          body: renderBody(booking, window),
          idempotencyKey,
          createdAt: new Date().toISOString(),
          attempts: 0
        };
        state.reminders.set(reminder.id, reminder);
        state.idempotencyIndex.set(idempotencyKey, reminder.id);
        recordFor(booking.id).add(reminder.id);
        enqueued.push(reminder);
      }
      return { bookingId: booking.id, enqueued, skipped };
    },

    cancelForBooking(bookingId, _reason) {
      const ids = state.byBooking.get(bookingId);
      if (!ids) return { cancelled: 0 };
      let cancelled = 0;
      for (const id of ids) {
        const r = state.reminders.get(id);
        if (r && r.status === "pending") {
          r.status = "cancelled";
          cancelled += 1;
        }
      }
      return { cancelled };
    },

    dueReminders(now = new Date()) {
      const cutoff = now.getTime();
      return allReminders()
        .filter((r) => r.status === "pending" && new Date(r.scheduledSendAt).getTime() <= cutoff)
        .sort(
          (a, b) =>
            new Date(a.scheduledSendAt).getTime() - new Date(b.scheduledSendAt).getTime()
        );
    },

    async processDue({ provider, now = new Date() }) {
      const due = this.dueReminders(now);
      let sent = 0;
      let failed = 0;
      for (const reminder of due) {
        reminder.attempts += 1;
        const result: SendResult | SendFailure = await provider.send({
          to: reminder.to,
          channel: reminder.channel,
          body: reminder.body,
          templateId: reminder.templateId,
          idempotencyKey: reminder.idempotencyKey
        });
        if (result.ok) {
          reminder.status = "sent";
          reminder.sentAt = result.sentAt;
          reminder.providerMessageId = result.providerMessageId;
          reminder.lastError = undefined;
          sent += 1;
        } else {
          reminder.status = "failed";
          reminder.lastError = result.error;
          failed += 1;
        }
      }
      return {
        now: now.toISOString(),
        attempted: due.length,
        sent,
        failed,
        reminders: due
      };
    },

    snapshot() {
      return {
        reminders: allReminders().sort(
          (a, b) =>
            new Date(a.scheduledSendAt).getTime() - new Date(b.scheduledSendAt).getTime()
        )
      };
    },

    listByBooking(bookingId) {
      const ids = state.byBooking.get(bookingId);
      if (!ids) return [];
      return Array.from(ids)
        .map((id) => state.reminders.get(id))
        .filter((r): r is ScheduledReminder => Boolean(r));
    },

    reset() {
      state.reminders.clear();
      state.byBooking.clear();
      state.idempotencyIndex.clear();
    }
  };
}
