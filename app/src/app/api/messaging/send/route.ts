import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessagingProvider } from "../../../../lib/messaging/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SendSchema = z.object({
  to: z.string().min(3),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  body: z.string().min(1).max(1600),
  templateId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  meta: z.record(z.unknown()).optional()
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = SendSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const result = await getMessagingProvider().send(parsed.data);
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result, { status: 202 });
}
