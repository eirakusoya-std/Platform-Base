import { NextResponse } from "next/server";
import { createVtuberToken, createSpeakerToken, createListenerToken } from "@repo/livekit";
import { resolveSessionUser } from "@/app/lib/server/auth";
import {
  getStreamSessionById,
  hasActiveReservation,
  hasActiveSpeakerReservation,
} from "@/app/lib/server/aimentStore";
import { canAccessPlan, getEffectivePlanForUser } from "@/app/lib/server/billingStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { sessionId, role } = (await request.json()) as { sessionId: string; role: "vtuber" | "speaker" | "listener" };
    if (!sessionId || !["vtuber", "speaker", "listener"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
    }

    const session = await getStreamSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionUser = await resolveSessionUser();

    if (role === "vtuber") {
      if (!sessionUser) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (sessionUser.role !== "vtuber" || session.hostUserId !== sessionUser.id) {
        return NextResponse.json({ error: "Only the session host can join as VTuber" }, { status: 403 });
      }
    }

    if (role !== "vtuber" && session.status !== "live") {
      return NextResponse.json({ error: "Broadcast is not live" }, { status: 403 });
    }

    if (role === "speaker" && !sessionUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (role === "speaker") {
      const reserved = await hasActiveSpeakerReservation(sessionUser!.id, sessionId);
      if (!reserved) {
        return NextResponse.json({ error: "Speaker reservation required" }, { status: 403 });
      }
    }

    if (role === "listener" && (session.reservationRequired || session.requiredPlan !== "free")) {
      if (!sessionUser) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const userPlan = await getEffectivePlanForUser(sessionUser.id);
      if (!canAccessPlan(userPlan, session.requiredPlan)) {
        return NextResponse.json({ error: `This session requires the ${session.requiredPlan} plan` }, { status: 403 });
      }
      if (session.reservationRequired) {
        const reserved = await hasActiveReservation(sessionUser.id, sessionId, "listener");
        if (!reserved) {
          return NextResponse.json({ error: "Reservation required" }, { status: 403 });
        }
      }
    }

    const userId = sessionUser?.id ?? `guest-${crypto.randomUUID()}`;
    const userName = sessionUser?.name ?? "Guest";

    const roomName = sessionId;
    const params = { apiKey, apiSecret, roomName, userId, userName };

    const token =
      role === "vtuber"
        ? await createVtuberToken(params)
        : role === "speaker"
          ? await createSpeakerToken(params)
          : await createListenerToken(params);

    return NextResponse.json({ token, livekitUrl, roomName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
