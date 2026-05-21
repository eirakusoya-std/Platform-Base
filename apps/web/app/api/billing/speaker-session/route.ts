import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { getStreamSessionById } from "@/app/lib/server/aimentStore";
import { getStripeClient, getSpeakerSessionPriceId, getSpeakerSessionAmountPhp } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

    const session = await getStreamSessionById(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "ended") return NextResponse.json({ error: "この配信枠は終了しています" }, { status: 400 });

    // Payment window: 24h before startsAt
    const startsAt = new Date(session.startsAt);
    const paymentWindowOpen = Date.now() >= startsAt.getTime() - 24 * 60 * 60 * 1000;
    if (!paymentWindowOpen) {
      const opensAt = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
      return NextResponse.json(
        { error: `支払いは ${opensAt.toLocaleString("ja-JP")} から受け付けます`, opensAt: opensAt.toISOString() },
        { status: 403 },
      );
    }

    const durationMin = session.plannedDurationMin ?? 60;
    const amountPhp = getSpeakerSessionAmountPhp(durationMin);
    const priceId = getSpeakerSessionPriceId(durationMin);

    const stripe = await getStripeClient();
    if (!stripe) return NextResponse.json({ error: "決済サービスが設定されていません" }, { status: 500 });
    if (!priceId) return NextResponse.json({ error: "スピーカー料金が設定されていません" }, { status: 500 });

    const price = await stripe.prices.retrieve(priceId);
    if (!price.unit_amount) return NextResponse.json({ error: "商品の金額が取得できませんでした" }, { status: 500 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      metadata: {
        type: "speaker_session",
        sessionId,
        userId: actor.id,
        userName: actor.name,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amountPhp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "決済の準備に失敗しました";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
