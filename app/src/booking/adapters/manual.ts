import { z } from "zod";
import type { BookingAdapter, PullResult } from "../types";

const manualConfigSchema = z.object({}).passthrough().optional().default({});

export type ManualConfig = z.infer<typeof manualConfigSchema>;

export const manualAdapter: BookingAdapter<ManualConfig> = {
  kind: "manual",
  validateConfig(raw) {
    return manualConfigSchema.parse(raw ?? {});
  },
  async pullWindow(): Promise<PullResult> {
    return { bookings: [] };
  }
};
