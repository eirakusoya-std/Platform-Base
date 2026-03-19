import { NextResponse } from "next/server";
import { createVtuberToken, createSpeakerToken } from "@repo/livekit";
import { resolveSessionUser } from "@/app/lib/server/auth";
import { hasActiveSpeakerReservation } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { sessionId, role } = (await request.json()) as { sessionId: string; role: "vtuber" | "speaker" };

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
    }

    // both vtuber and speaker require authentication
    const sessionUser = await resolveSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // speaker requires an active reservation
    if (role === "speaker") {
      const reserved = await hasActiveSpeakerReservation(sessionUser.id, sessionId);
      if (!reserved) {
        return NextResponse.json({ error: "Speaker reservation required" }, { status: 403 });
      }
    }

    const userId = sessionUser.id;
    const userName = sessionUser.name;

    const roomName = `session-${sessionId}`;
    const params = { apiKey, apiSecret, roomName, userId, userName };

    const token =
      role === "vtuber"
        ? await createVtuberToken(params)
        : await createSpeakerToken(params);

    return NextResponse.json({ token, livekitUrl, roomName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
