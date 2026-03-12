import { NextResponse } from "next/server";
import { cancelSubscriptionForUser, listSubscriptionsForUser } from "@/app/lib/server/billingStore";
import { requireSessionUser } from "@/app/lib/server/auth";
import { recordMonitoringEvent } from "@/app/lib/server/opsStore";
import { getStripeClient } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ subscriptionId: string }> }) {
  try {
    const user = await requireSessionUser();
    const { subscriptionId } = await context.params;
    const subscriptions = await listSubscriptionsForUser(user.id);
    const current = subscriptions.find((entry) => entry.subscriptionId === subscriptionId);
    if (!current) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (current.provider === "stripe" && current.providerSubscriptionId) {
      const stripe = await getStripeClient();
      if (stripe) {
        await stripe.subscriptions.update(current.providerSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }

    const subscription = await cancelSubscriptionForUser(user.id, subscriptionId);
    return NextResponse.json({ subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel subscription";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "billing.subscription.cancel_failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
