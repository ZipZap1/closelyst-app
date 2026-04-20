import { z } from "zod";
import type { BookingAdapter, NormalizedBooking, PullResult, PullWindow } from "../types";

const csvConfigSchema = z.object({
  delimiter: z.string().length(1).default(","),
  data: z.string().default("")
});

export type CsvConfig = z.infer<typeof csvConfigSchema>;

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // skip
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

const headerMap: Record<string, keyof NormalizedBooking> = {
  external_id: "externalId",
  scheduled_at: "scheduledAt",
  duration_minutes: "durationMinutes",
  customer_full_name: "customerFullName",
  customer_phone_e164: "customerPhoneE164",
  notes: "notes"
};

const requiredHeaders = [
  "external_id",
  "scheduled_at",
  "duration_minutes",
  "customer_full_name",
  "customer_phone_e164"
];

export const csvAdapter: BookingAdapter<CsvConfig> = {
  kind: "csv",
  validateConfig(raw) {
    return csvConfigSchema.parse(raw ?? {});
  },
  async pullWindow(config: CsvConfig, window: PullWindow): Promise<PullResult> {
    const rows = parseCsv(config.data, config.delimiter);
    if (rows.length === 0) return { bookings: [] };
    const [header, ...body] = rows as [string[], ...string[][]];
    const normalized = header.map((h) => h.trim().toLowerCase());
    for (const h of requiredHeaders) {
      if (!normalized.includes(h)) {
        throw new Error(`CSV missing required column: ${h}`);
      }
    }
    const bookings: NormalizedBooking[] = [];
    for (const raw of body) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < normalized.length; i++) {
        const key = normalized[i];
        if (key === undefined) continue;
        obj[key] = (raw[i] ?? "").trim();
      }
      const scheduledAt = new Date(obj.scheduled_at ?? "");
      if (Number.isNaN(scheduledAt.getTime())) continue;
      if (scheduledAt < window.from || scheduledAt > window.to) continue;
      const booking: NormalizedBooking = {
        externalId: obj.external_id ?? "",
        scheduledAt,
        durationMinutes: Number.parseInt(obj.duration_minutes ?? "0", 10),
        customerFullName: obj.customer_full_name ?? "",
        customerPhoneE164: obj.customer_phone_e164 ?? ""
      };
      if (obj.notes) booking.notes = obj.notes;
      if (!booking.externalId || !booking.customerPhoneE164) continue;
      if (!(booking.durationMinutes > 0)) continue;
      bookings.push(booking);
    }
    return { bookings };
  }
};

export const __testing = { parseCsv };
