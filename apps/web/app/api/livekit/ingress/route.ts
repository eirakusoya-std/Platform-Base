import { NextResponse } from "next/server";
import { createRtmpIngress, deleteRtmpIngress } from "@repo/livekit";
import { requireSessionUser } from "@/app/lib/server/auth";
import {
  clearSessionIngress,
  getStreamSessionById,
  setSessionIngress,
} from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLivekitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const host = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !host) throw new Error("LiveKit not configured");
  return { apiKey, apiSecret, host };
}

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

    if (!session.ingressId) return NextResponse.json({ ingress: null });

    return NextResponse.json({
      ingress: {
        ingressId: session.ingressId,
        streamKey: session.streamKey,
        rtmpUrl: session.rtmpUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get ingress";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    if (actor.role !== "vtuber")
      return NextResponse.json({ error: "VTuber accounts only" }, { status: 403 });

    const { sessionId } = (await request.json()) as { sessionId: string };
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const session = await getStreamSessionById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.hostUserId !== actor.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { apiKey, apiSecret, host } = getLivekitConfig();

    const result = await createRtmpIngress({
      apiKey,
      apiSecret,
      host,
      roomName: sessionId,
      participantIdentity: `obs-${actor.id}`,
      participantName: actor.name,
      streamName: session.title,
    });

    await setSessionIngress(sessionId, result.ingressId, result.streamKey, result.rtmpUrl);

    return NextResponse.json({ ingress: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ingress";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireSessionUser();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const session = await getStreamSessionById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.hostUserId !== actor.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (session.ingressId) {
      const { apiKey, apiSecret, host } = getLivekitConfig();
      try {
        await deleteRtmpIngress({ apiKey, apiSecret, host, ingressId: session.ingressId });
      } catch {
        // ingress may already be gone on LiveKit side; clear DB regardless
      }
      await clearSessionIngress(sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete ingress";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
