import { csvAdapter } from "./adapters/csv";
import { icalAdapter } from "./adapters/ical";
import { manualAdapter } from "./adapters/manual";
import type { BookingAdapter, BookingSourceKind } from "./types";

export type { BookingAdapter, BookingSourceKind, NormalizedBooking, PullResult, PullWindow } from "./types";

const registry: Record<Exclude<BookingSourceKind, "later">, BookingAdapter> = {
  manual: manualAdapter,
  csv: csvAdapter,
  ical: icalAdapter
};

export function getAdapter(kind: BookingSourceKind): BookingAdapter {
  if (kind === "later") {
    throw new Error("'later' is not a real adapter; no-op handled by the caller");
  }
  const adapter = registry[kind];
  if (!adapter) throw new Error(`Unknown booking adapter: ${kind}`);
  return adapter;
}

export { csvAdapter, icalAdapter, manualAdapter };
