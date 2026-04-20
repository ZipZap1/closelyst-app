import { NextResponse } from "next/server";
import { getReminderScheduler } from "../../../../lib/reminders/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get("bookingId");
  const scheduler = getReminderScheduler();
  if (bookingId) {
    return NextResponse.json({
      bookingId,
      reminders: scheduler.listByBooking(bookingId)
    });
  }
  return NextResponse.json(scheduler.snapshot());
}

export async function DELETE() {
  getReminderScheduler().reset();
  return NextResponse.json({ ok: true, cleared: true });
}
