// SOLID: S（アーリーアクセス決済のPaymentIntent生成に専念）
import { NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!name) return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });

    const stripe = await getStripeClient();
    if (!stripe) return NextResponse.json({ error: "決済サービスが設定されていません" }, { status: 500 });

    const priceId = process.env.EARLY_ACCESS_PRICE_ID?.trim();
    if (!priceId) return NextResponse.json({ error: "商品が設定されていません" }, { status: 500 });

    const price = await stripe.prices.retrieve(priceId);
    if (!price.unit_amount) return NextResponse.json({ error: "商品の金額が取得できませんでした" }, { status: 500 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      metadata: { type: "early_access", participantName: name, participantEmail: email },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "決済の準備に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
