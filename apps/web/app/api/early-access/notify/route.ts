// SOLID: S（アーリーアクセス支払い完了通知の送信に専念）
import { NextResponse } from "next/server";
import { getStripeClient } from "@/app/lib/server/stripe";
import { sendEarlyAccessNotification } from "@/app/lib/server/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { paymentIntentId?: unknown };
    const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
    if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });

    const stripe = await getStripeClient();
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const participantName = typeof pi.metadata?.participantName === "string" ? pi.metadata.participantName : "";
    const participantEmail = typeof pi.metadata?.participantEmail === "string" ? pi.metadata.participantEmail : "";
    if (!participantName || !participantEmail) {
      return NextResponse.json({ error: "Participant info not found" }, { status: 400 });
    }

    await sendEarlyAccessNotification({ participantName, participantEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
