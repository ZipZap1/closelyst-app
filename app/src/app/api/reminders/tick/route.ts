import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessagingProvider } from "../../../../lib/messaging/registry";
import { getReminderScheduler } from "../../../../lib/reminders/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TickSchema = z.object({
  now: z.string().datetime().optional()
});

export async function POST(req: Request) {
  let payload: unknown = {};
  try {
    if (req.headers.get("content-length") !== "0" && req.body) {
      payload = await req.json();
    }
  } catch {
    payload = {};
  }
  const parsed = TickSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const now = parsed.data.now ? new Date(parsed.data.now) : new Date();
  const result = await getReminderScheduler().processDue({
    provider: getMessagingProvider(),
    now
  });
  return NextResponse.json({ ok: true, ...result });
}
