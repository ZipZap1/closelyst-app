import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Placeholder webhook for inbound BSP/SMS replies. The real implementation
 * (HMAC signature verification, reply parsing, booking-status fan-out) is
 * assigned to the engineer hire tracked on HAC-1 / HAC-8 and will land under
 * the scope of HAC-12 once that work is executed.
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { accepted: false, reason: "messaging inbound not implemented" },
    { status: 501 }
  );
}
