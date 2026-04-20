import { NextResponse } from "next/server";
import { z } from "zod";
import { getReminderScheduler } from "../../../../lib/reminders/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EnqueueSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  locationName: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerPhoneE164: z.string().min(3),
  scheduledAt: z.string().datetime(),
  channel: z.enum(["whatsapp", "sms"]).optional()
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = EnqueueSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const result = getReminderScheduler().enqueueForBooking(parsed.data);
  return NextResponse.json({ ok: true, ...result }, { status: 202 });
}
