import { NextResponse } from "next/server";
import { checkObsConnected } from "@repo/livekit";
import { requireSessionUser } from "@/app/lib/server/auth";
import { getStreamSessionById } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireSessionUser();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const session = await getStreamSessionById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.hostUserId !== actor.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const host = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !host) return NextResponse.json({ connected: false });

    const connected = await checkObsConnected({
      apiKey,
      apiSecret,
      host,
      roomName: sessionId,
      participantIdentity: `obs-${actor.id}`,
    });

    return NextResponse.json({ connected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
