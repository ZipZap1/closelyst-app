import { NextResponse } from "next/server";
import { getMessagingProvider } from "../../../../lib/messaging/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getMessagingProvider().snapshot();
  return NextResponse.json({
    provider: "fake",
    outbound: snapshot.outbound.slice().reverse().slice(0, 50),
    inbound: snapshot.inbound.slice().reverse().slice(0, 50)
  });
}

export async function DELETE() {
  getMessagingProvider().reset();
  return NextResponse.json({ ok: true, cleared: true });
}
