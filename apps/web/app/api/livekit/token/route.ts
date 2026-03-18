import { NextResponse } from "next/server";
import { createVtuberToken, createSpeakerToken } from "@repo/livekit";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const { sessionId, role } = (await request.json()) as { sessionId: string; role: "vtuber" | "speaker" };

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
    }

    const roomName = `session-${sessionId}`;
    const params = { apiKey, apiSecret, roomName, userId: user.id, userName: user.name };

    const token =
      role === "vtuber"
        ? await createVtuberToken(params)
        : await createSpeakerToken(params);

    return NextResponse.json({ token, livekitUrl, roomName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create token";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
