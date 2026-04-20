export type BookingSourceKind = "manual" | "csv" | "ical" | "later";

export interface NormalizedBooking {
  externalId: string;
  scheduledAt: Date;
  durationMinutes: number;
  customerFullName: string;
  customerPhoneE164: string;
  notes?: string;
}

export interface PullWindow {
  from: Date;
  to: Date;
}

export interface PullResult {
  bookings: NormalizedBooking[];
  cursor?: string;
}

export interface BookingAdapter<Config = unknown> {
  readonly kind: BookingSourceKind;
  validateConfig(raw: unknown): Config;
  pullWindow(config: Config, window: PullWindow, previousCursor?: string): Promise<PullResult>;
}
