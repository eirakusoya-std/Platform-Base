// SOLID: O（新イベントを追加する際に既存ハンドラを変更せず拡張できる構造を維持）
import { NextResponse } from "next/server";
import type { SubscriptionPlan, SubscriptionStatus } from "@/app/lib/apiTypes";
import { activateTicketPurchase, logPaymentEvent, markSubscriptionStatusByProviderId } from "@/app/lib/server/billingStore";
import { recordMonitoringEvent } from "@/app/lib/server/opsStore";
import { getStripeClient } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPeriodEnd(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  return undefined;
}

function parsePlan(value: unknown): SubscriptionPlan | undefined {
  return value === "aimer" || value === "premium" || value === "supporter" ? "aimer" : value === "free" ? "free" : undefined;
}

async function processEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }) {
  const object = event.data.object;
  const metadata = (object.metadata as Record<string, unknown> | undefined) ?? {};
  const status = typeof object.status === "string" ? object.status : undefined;
  const userId = typeof metadata.userId === "string" ? metadata.userId : undefined;
  const targetUserId = typeof metadata.targetUserId === "string" ? metadata.targetUserId : undefined;
  const plan = parsePlan(metadata.plan);
  const providerSubscriptionId = event.type.startsWith("customer.subscription")
    ? (typeof object.id === "string" ? object.id : undefined)
    : (typeof object.subscription === "string" ? object.subscription : undefined);
  const checkoutSessionId = event.type === "checkout.session.completed" && typeof object.id === "string" ? object.id : undefined;
  const providerCustomerId =
    typeof object.customer === "string"
      ? object.customer
      : undefined;

  // PaymentIntent成功: Elements経由のチケット決済をアクティブ化（idempotent）
  if (event.type === "payment_intent.succeeded") {
    const providerPaymentIntentId = typeof object.id === "string" ? object.id : undefined;
    if (providerPaymentIntentId) {
      await activateTicketPurchase({ providerPaymentIntentId });
    }
    await logPaymentEvent({
      provider: "stripe",
      providerEventId: event.id,
      type: "payment_intent.succeeded",
      status: "processed",
      summary: targetUserId ? `Ticket payment succeeded for ${targetUserId}` : "Payment intent succeeded",
      relatedUserId: userId,
    });
    return;
  }

  // checkout.session.completed: 旧Checkout方式との後方互換（idempotent）
  if (event.type === "checkout.session.completed") {
    const sessionMode = typeof object.mode === "string" ? object.mode : undefined;
    if (sessionMode === "payment") {
      const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : undefined;
      if (checkoutSessionId) {
        await activateTicketPurchase({ checkoutSessionId, providerPaymentIntentId: paymentIntentId });
      }
      await logPaymentEvent({
        provider: "stripe",
        providerEventId: event.id,
        type: "checkout.session.completed",
        status: "processed",
        summary: targetUserId ? `Ticket purchase completed for ${targetUserId}` : "Ticket purchase completed",
        relatedUserId: userId,
      });
      return;
    }
  }

  let nextStatus: SubscriptionStatus | undefined;

  // invoice.paid / invoice.payment_succeeded: どちらもサブスクアクティブ化
  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
    nextStatus = "active";
  } else if (event.type === "invoice.payment_failed") {
    nextStatus = "past_due";
  } else if (event.type === "customer.subscription.deleted") {
    nextStatus = "canceled";
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    nextStatus =
      status === "active" || status === "trialing" || status === "past_due" || status === "canceled"
        ? status
        : "inactive";
  }

  const subscription = nextStatus
    ? await markSubscriptionStatusByProviderId({
        provider: "stripe",
        providerSubscriptionId,
        checkoutSessionId,
        userId,
        plan,
        providerCustomerId,
        status: nextStatus,
        currentPeriodEnd: getPeriodEnd(object.current_period_end),
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
      })
    : null;

  await logPaymentEvent({
    provider: "stripe",
    providerEventId: event.id,
    type: event.type,
    status: nextStatus === "past_due" ? "failed" : "processed",
    summary: `${event.type} processed`,
    relatedUserId: userId,
    relatedSubscriptionId: subscription?.subscriptionId,
    errorMessage: nextStatus === "past_due" ? "Payment failed" : undefined,
  });

  if (nextStatus === "past_due") {
    await recordMonitoringEvent({
      source: "billing",
      level: "warn",
      code: "billing.payment.failed",
      message: "Stripe reported a failed invoice payment",
      meta: { userId: userId ?? "unknown", eventId: event.id },
    });
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const stripe = await getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const signature = request.headers.get("stripe-signature");

    let event: { id: string; type: string; data: { object: Record<string, unknown> } };

    if (stripe && webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as unknown as typeof event;
    } else {
      event = JSON.parse(body) as typeof event;
    }

    await processEvent(event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await logPaymentEvent({
      provider: "stripe",
      providerEventId: `failed_${Date.now()}`,
      type: "webhook.failed",
      status: "failed",
      summary: "Webhook processing failed",
      errorMessage: message,
    });
    await recordMonitoringEvent({
      source: "billing",
      level: "error",
      code: "billing.webhook.failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
