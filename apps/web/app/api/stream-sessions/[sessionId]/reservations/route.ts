import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import {
  createReservation,
  getStreamSessionById,
  hasActiveSpeakerReservation,
} from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** GET /api/stream-sessions/[sessionId]/reservations
 *  Returns the current user's reservation status for this session.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const actor = await requireSessionUser();
    const session = await getStreamSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isSpeaker = await hasActiveSpeakerReservation(actor.id, sessionId);

    return NextResponse.json({
      hasSpeakerReservation: isSpeaker,
      speakerSlotsLeft: session.speakerSlotsLeft,
      speakerSlotsTotal: session.speakerSlotsTotal,
      speakerRequiredPlan: session.speakerRequiredPlan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST /api/stream-sessions/[sessionId]/reservations
 *  Body: { type: "speaker" | "listener" }
 *  Creates a reservation for the current user.
 */
export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const actor = await requireSessionUser();
    const body = (await req.json()) as { type?: string };
    const type = body.type === "speaker" ? "speaker" : "listener";

    const reservation = await createReservation(actor, { sessionId, type });
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Authentication required"
        ? 401
        : message.includes("plan") || message.includes("slots left")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
