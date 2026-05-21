import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import {
  confirmSpeakerPayment,
  getStreamSessionById,
  hasActiveSpeakerReservation,
} from "@/app/lib/server/aimentStore";
import { getStripeClient } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * POST /api/stream-sessions/[sessionId]/reservations/confirm-payment
 * Body: { paymentIntentId: string }
 *
 * Stripe 支払い完了を検証し、既存のスピーカー予約に payment_intent_id を紐付ける。
 * - 支払いウィンドウ（startsAt の24時間前〜）以外はエラー
 * - PaymentIntent の userId / sessionId が一致しない場合はエラー
 * - 予約が存在しない場合はエラー
 */
export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const actor = await requireSessionUser();

    const body = (await req.json()) as { paymentIntentId?: unknown };
    const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    if (!paymentIntentId) {
      return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
    }

    const session = await getStreamSessionById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "ended") return NextResponse.json({ error: "この配信枠は終了しています" }, { status: 400 });

    // Payment window: 24h before startsAt
    const startsAt = new Date(session.startsAt);
    const paymentWindowOpen = Date.now() >= startsAt.getTime() - 24 * 60 * 60 * 1000;
    if (!paymentWindowOpen) {
      const opensAt = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
      return NextResponse.json(
        { error: `支払いは ${opensAt.toLocaleString("ja-JP")} から受け付けます` },
        { status: 403 },
      );
    }

    // Must have an existing reservation
    const hasReservation = await hasActiveSpeakerReservation(actor.id, sessionId);
    if (!hasReservation) {
      return NextResponse.json({ error: "先にスピーカー枠を予約してください" }, { status: 400 });
    }

    // Validate Stripe PaymentIntent
    const stripe = await getStripeClient();
    if (!stripe) return NextResponse.json({ error: "決済サービスが設定されていません" }, { status: 500 });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "支払いが完了していません" }, { status: 402 });
    }
    const meta = pi.metadata as Record<string, string>;
    if (meta.sessionId !== sessionId) {
      return NextResponse.json({ error: "支払い情報がこの枠と一致しません" }, { status: 400 });
    }
    if (meta.userId !== actor.id) {
      return NextResponse.json({ error: "支払い情報がこのアカウントと一致しません" }, { status: 400 });
    }

    const reservation = await confirmSpeakerPayment(actor.id, sessionId, paymentIntentId);
    if (!reservation) return NextResponse.json({ error: "予約の更新に失敗しました" }, { status: 500 });

    return NextResponse.json({ reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
