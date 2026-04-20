import { createScheduler, type ReminderScheduler } from "./scheduler";

declare global {
  var __machDasMalReminderScheduler: ReminderScheduler | undefined;
}

export function getReminderScheduler(): ReminderScheduler {
  if (!globalThis.__machDasMalReminderScheduler) {
    globalThis.__machDasMalReminderScheduler = createScheduler();
  }
  return globalThis.__machDasMalReminderScheduler;
}
