import { z } from "zod";

export const industrySchema = z.enum(["clinic", "salon", "other"]);
export type Industry = z.infer<typeof industrySchema>;

export const step1Schema = z
  .object({
    tenantName: z.string().trim().min(1),
    billingEmail: z.string().trim().email(),
    industry: industrySchema,
    dpaAck: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.industry === "clinic" && !data.dpaAck) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DPA-Bestätigung erforderlich für Praxen",
        path: ["dpaAck"]
      });
    }
  });
export type Step1Input = z.infer<typeof step1Schema>;

export const step2Schema = z.object({
  locationName: z.string().trim().min(1),
  timezone: z.string().trim().min(1).default("Europe/Berlin"),
  ownerName: z.string().trim().min(1),
  ownerEmail: z.string().trim().email()
});
export type Step2Input = z.infer<typeof step2Schema>;

export const bookingSourceKindSchema = z.enum(["manual", "csv", "ical", "later"]);

export const step3Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual") }),
  z.object({ kind: z.literal("later") }),
  z.object({ kind: z.literal("csv"), csvData: z.string().min(1) }),
  z.object({ kind: z.literal("ical"), feedUrl: z.string().url() })
]);
export type Step3Input = z.infer<typeof step3Schema>;

export const step5Schema = z.object({
  window24h: z.boolean().default(true),
  window2h: z.boolean().default(true),
  preferWhatsapp: z.boolean().default(true),
  waitlistEnabled: z.boolean().default(true)
});
export type Step5Input = z.infer<typeof step5Schema>;

export interface OnboardingDraft {
  step1?: Step1Input;
  step2?: Step2Input;
  step3?: Step3Input;
  step5?: Step5Input;
}
