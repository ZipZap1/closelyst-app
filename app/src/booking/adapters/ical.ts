import ICAL from "ical.js";
import { z } from "zod";
import type { BookingAdapter, NormalizedBooking, PullResult, PullWindow } from "../types";

const icalConfigSchema = z.object({
  feedUrl: z.string().url().optional(),
  feedBody: z.string().optional(),
  defaultDurationMinutes: z.number().int().positive().default(30)
});

export type IcalConfig = z.infer<typeof icalConfigSchema>;

async function fetchFeedBody(config: IcalConfig): Promise<string> {
  if (config.feedBody) return config.feedBody;
  if (!config.feedUrl) throw new Error("iCal config requires feedUrl or feedBody");
  const response = await fetch(config.feedUrl, {
    headers: { Accept: "text/calendar" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`iCal feed fetch failed: ${response.status}`);
  }
  return response.text();
}

function phoneFromEvent(event: ICAL.Event): string {
  const attendees = event.attendees ?? [];
  for (const a of attendees) {
    const cal = a.getFirstValue()?.toString() ?? "";
    const match = cal.match(/tel:(\+?\d[\d\s-]+)/i);
    if (match?.[1]) return match[1].replace(/\s|-/g, "");
  }
  const desc = event.description ?? "";
  const descMatch = desc.match(/(\+\d{6,15})/);
  return descMatch?.[1] ?? "";
}

export const icalAdapter: BookingAdapter<IcalConfig> = {
  kind: "ical",
  validateConfig(raw) {
    return icalConfigSchema.parse(raw ?? {});
  },
  async pullWindow(config: IcalConfig, window: PullWindow): Promise<PullResult> {
    const body = await fetchFeedBody(config);
    const jcal = ICAL.parse(body);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents("vevent");
    const bookings: NormalizedBooking[] = [];
    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const start = event.startDate?.toJSDate();
      if (!start) continue;
      if (start < window.from || start > window.to) continue;
      const end = event.endDate?.toJSDate();
      const durationMinutes = end
        ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
        : config.defaultDurationMinutes;
      const phone = phoneFromEvent(event);
      if (!phone) continue;
      const externalId = event.uid;
      if (!externalId) continue;
      const booking: NormalizedBooking = {
        externalId,
        scheduledAt: start,
        durationMinutes,
        customerFullName: event.summary ?? "Kund*in",
        customerPhoneE164: phone
      };
      if (event.description) booking.notes = event.description;
      bookings.push(booking);
    }
    return { bookings, cursor: new Date().toISOString() };
  }
};
