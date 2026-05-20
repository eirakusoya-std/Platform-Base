import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import {
  createReservation,
  getStreamSessionById,
  hasActiveSpeakerReservation,
  listReservationsForSession,
} from "@/app/lib/server/aimentStore";
import { getStripeClient } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** GET /api/stream-sessions/[sessionId]/reservations
 *  - 通常: 現在ユーザーの予約状況を返す
 *  - ?asHost=1: ホスト本人のみ全スピーカー予約一覧を返す
 */
export async function GET(req: Request, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const url = new URL(req.url);
    const asHost = url.searchParams.get("asHost") === "1";

    if (asHost) {
      const actor = await requireSessionUser();
      const reservations = await listReservationsForSession(sessionId, actor);
      const speakers = reservations.filter((r) => r.type === "speaker" && r.status === "reserved");
      return NextResponse.json({ reservations: speakers });
    }

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
 *  Body: { type: "speaker", paymentIntentId: string }
 *  スピーカー予約はStripe支払い確認が必須。
 */
export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const actor = await requireSessionUser();
    const body = (await req.json()) as { type?: string; paymentIntentId?: string };
    const type = body.type === "speaker" ? "speaker" : "listener";

    if (type === "speaker") {
      const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
      if (!paymentIntentId) {
        return NextResponse.json({ error: "支払い情報が必要です" }, { status: 400 });
      }

      const stripe = await getStripeClient();
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return NextResponse.json({ error: "支払いが完了していません" }, { status: 402 });
        }
        const meta = pi.metadata as Record<string, string>;
        if (meta.sessionId !== sessionId) {
          return NextResponse.json({ error: "支払い情報がこの枠と一致しません" }, { status: 400 });
        }
        if (meta.userId !== actor.id) {
          return NextResponse.json({ error: "支払い情報がアカウントと一致しません" }, { status: 400 });
        }
      }
    }

    const reservation = await createReservation(actor, { sessionId, type });
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Authentication required"
        ? 401
        : message.includes("already have") || message.includes("plan") || message.includes("slots left")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
