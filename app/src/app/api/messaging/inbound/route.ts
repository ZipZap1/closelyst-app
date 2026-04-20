import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessagingProvider } from "../../../../lib/messaging/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InboundSchema = z.object({
  from: z.string().min(3),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  body: z.string().min(1).max(1600),
  receivedAt: z.string().datetime().optional(),
  meta: z.record(z.unknown()).optional()
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ accepted: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = InboundSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { accepted: false, error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const result = getMessagingProvider().handleInbound(parsed.data);
  return NextResponse.json(result, { status: 202 });
}
