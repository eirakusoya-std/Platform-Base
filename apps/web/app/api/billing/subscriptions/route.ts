import { NextResponse } from "next/server";
import type { CreateCheckoutInput, SubscriptionPlan } from "@/app/lib/apiTypes";
import { requireSessionUser } from "@/app/lib/server/auth";
import {
  activateMockSubscription,
  createPendingSubscription,
  listPaymentEventsForUser,
  listSubscriptionsForUser,
  logPaymentEvent,
} from "@/app/lib/server/billingStore";
import { recordMonitoringEvent } from "@/app/lib/server/opsStore";
import { getBillingCancelUrl, getBillingSuccessUrl, getStripeClient, getStripePriceId } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPaidPlan(plan: SubscriptionPlan): plan is Exclude<SubscriptionPlan, "free"> {
  return plan === "supporter" || plan === "premium";
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const subscriptions = await listSubscriptionsForUser(user.id);
    const paymentEvents = await listPaymentEventsForUser(user.id);
    return NextResponse.json({ subscriptions, paymentEvents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load subscriptions";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "billing.subscriptions.load_failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json().catch(() => ({}))) as CreateCheckoutInput;
    if (!isPaidPlan(body.plan)) {
      return NextResponse.json({ error: "A paid plan is required" }, { status: 400 });
    }

    const stripe = await getStripeClient();
    const priceId = getStripePriceId(body.plan);

    if (!stripe || !priceId) {
      const subscription = await activateMockSubscription(user.id, body.plan);
      await recordMonitoringEvent({
        source: "billing",
        level: "info",
        code: "billing.mock_subscription.activated",
        message: `Mock subscription activated: ${body.plan}`,
        meta: { userId: user.id, plan: body.plan },
      });
      return NextResponse.json({ subscription, mode: "mock" }, { status: 201 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: getBillingSuccessUrl(),
      cancel_url: getBillingCancelUrl(),
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: user.id,
        plan: body.plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: body.plan,
        },
      },
    });

    const subscription = await createPendingSubscription({
      userId: user.id,
      provider: "stripe",
      plan: body.plan,
      checkoutUrl: checkoutSession.url ?? undefined,
      providerCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : undefined,
      providerSubscriptionId: typeof checkoutSession.subscription === "string" ? checkoutSession.subscription : undefined,
      checkoutSessionId: checkoutSession.id,
    });

    await logPaymentEvent({
      provider: "stripe",
      providerEventId: checkoutSession.id,
      type: "checkout.session.created",
      status: "received",
      summary: `Checkout session created for ${body.plan}`,
      relatedUserId: user.id,
      relatedSubscriptionId: subscription.subscriptionId,
    });

    return NextResponse.json({ subscription, checkoutUrl: checkoutSession.url, mode: "stripe" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create subscription";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "billing.subscription.create_failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
