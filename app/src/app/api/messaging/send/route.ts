import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Placeholder sender endpoint. The real implementation (provider abstraction,
 * 360dialog + sms77 adapters, template rendering, idempotency, WA→SMS
 * fallback) is assigned to the engineer hire tracked on HAC-1 / HAC-8.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { sent: false, reason: "messaging send not implemented" },
    { status: 501 }
  );
}
