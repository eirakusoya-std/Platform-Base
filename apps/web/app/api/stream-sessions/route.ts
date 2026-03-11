import { NextResponse } from "next/server";
import type { StreamSessionStatus } from "@/app/lib/apiTypes";
import { createStreamSession, listStreamSessions } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStatuses(url: URL) {
  return url.searchParams
    .get("status")
    ?.split(",")
    .map((value) => value.trim())
    .filter((value): value is StreamSessionStatus => value === "prelive" || value === "live" || value === "ended");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statuses = parseStatuses(url);
  const sessions = await listStreamSessions(statuses);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    const body = await request.json();
    const session = await createStreamSession(actor, body);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
