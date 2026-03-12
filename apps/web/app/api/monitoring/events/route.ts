import { NextResponse } from "next/server";
import type { CreateMonitoringEventInput } from "@/app/lib/apiTypes";
import { getMonitoringSummary, recordMonitoringEvent } from "@/app/lib/server/opsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getMonitoringSummary();
  return NextResponse.json({ summary });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMonitoringEventInput;
    const event = await recordMonitoringEvent(body);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
