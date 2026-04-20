import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getFakeProvider,
  getMessagingProvider,
  getMetaProvider
} from "../../../../lib/messaging/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FakeInboundSchema = z.object({
  from: z.string().min(3),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  body: z.string().min(1).max(1600),
  receivedAt: z.string().datetime().optional(),
  meta: z.record(z.unknown()).optional()
});

export async function GET(req: Request) {
  const meta = getMetaProvider();
  if (!meta) {
    return NextResponse.json(
      { error: "webhook_verify_only_supported_for_meta_provider" },
      { status: 404 }
    );
  }
  const url = new URL(req.url);
  const challenge = meta.verifyWebhookSubscribe(url.searchParams);
  if (!challenge) {
    return NextResponse.json({ error: "verify_failed" }, { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}

export async function POST(req: Request) {
  const provider = getMessagingProvider();

  if (provider.name === "meta") {
    const meta = getMetaProvider()!;
    const rawBody = await req.text();
    const sig = req.headers.get("x-hub-signature-256");
    const result = meta.handleInbound(rawBody, sig);
    if ("rejected" in result) {
      return NextResponse.json({ accepted: false, reason: result.reason }, { status: 401 });
    }
    return NextResponse.json(result, { status: 202 });
  }

  const fake = getFakeProvider()!;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ accepted: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = FakeInboundSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { accepted: false, error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const result = fake.handleInbound(parsed.data);
  return NextResponse.json(result, { status: 202 });
}
