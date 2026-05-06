// SOLID: S（サブスク作成ロジックをAPIに集約し、決済UIはフロントのElements側に委譲）
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
import { getStripeClient, getStripePriceId } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPaidPlan(plan: SubscriptionPlan): plan is Exclude<SubscriptionPlan, "free"> {
  return plan === "aimer";
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

    // Stripe Customer を取得または作成
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId =
      existingCustomers.data[0]?.id ??
      (await stripe.customers.create({ email: user.email, metadata: { userId: user.id } })).id;

    // Stripe API 2025-03-31+ では invoice.payment_intent が廃止され confirmation_secret に変更。
    // confirmation_secret は expand しないとレスポンスに含まれないため明示指定が必須。
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity: 1 }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.confirmation_secret"],
      metadata: { userId: user.id, plan: body.plan },
    });

    // SDK v18 の型定義は expand 後のネスト構造を含まないため unknown キャストでアクセスする
    type ExpandedInv = { id: string; confirmation_secret: { client_secret: string | null } | null };
    type ExpandedSub = { latest_invoice: ExpandedInv | string | null };
    const expanded = stripeSubscription as unknown as ExpandedSub;
    const rawInvoice = expanded.latest_invoice;

    const invoiceId = typeof rawInvoice === "string" ? rawInvoice : (rawInvoice?.id ?? null);
    if (!invoiceId) throw new Error("Subscription has no latest_invoice");

    // expand されたオブジェクトから confirmation_secret を取得
    let clientSecret: string | null =
      typeof rawInvoice !== "string" ? (rawInvoice?.confirmation_secret?.client_secret ?? null) : null;

    // フォールバック: expand が効かなかった場合は invoice を明示 expand して再取得
    if (!clientSecret) {
      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ["confirmation_secret"],
      });
      clientSecret = invoice.confirmation_secret?.client_secret ?? null;
    }

    if (!clientSecret) {
      throw new Error("Cannot retrieve client_secret from invoice confirmation_secret");
    }

    const subscription = await createPendingSubscription({
      userId: user.id,
      provider: "stripe",
      plan: body.plan,
      providerCustomerId: customerId,
      providerSubscriptionId: stripeSubscription.id,
    });

    await logPaymentEvent({
      provider: "stripe",
      providerEventId: stripeSubscription.id,
      type: "subscription.created",
      status: "received",
      summary: `Subscription created for ${body.plan}`,
      relatedUserId: user.id,
      relatedSubscriptionId: subscription.subscriptionId,
    });

    return NextResponse.json(
      { subscription, clientSecret, subscriptionId: stripeSubscription.id, mode: "stripe" },
      { status: 201 },
    );
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
