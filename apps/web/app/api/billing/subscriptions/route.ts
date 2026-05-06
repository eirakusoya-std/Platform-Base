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

    // Subscription を作成（Stripe公式サブスクリプション統合ガイド準拠）
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity: 1 }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: user.id, plan: body.plan },
    });

    // SDK v18 の型定義は expand 後のネスト構造を含まないため unknown キャストでアクセスする
    type ExpandedPI = { id: string; client_secret: string | null };
    type ExpandedInv = {
      id: string;
      status: string;
      payment_intent: ExpandedPI | string | null;
      confirmation_secret?: { client_secret: string | null } | null;
    };
    type ExpandedSub = { latest_invoice: ExpandedInv | string | null };
    const expanded = stripeSubscription as unknown as ExpandedSub;
    const rawInvoice = expanded.latest_invoice;

    const invoiceId = typeof rawInvoice === "string" ? rawInvoice : (rawInvoice?.id ?? null);
    if (!invoiceId) throw new Error("Subscription has no latest_invoice");

    let clientSecret: string | null = null;

    // ① expand が成功してオブジェクトとして返った場合
    if (typeof rawInvoice !== "string" && rawInvoice) {
      const pi = rawInvoice.payment_intent;
      if (pi && typeof pi === "object") {
        clientSecret = pi.client_secret;
      } else if (typeof pi === "string") {
        // expand が ID 文字列のみを返した場合は直接取得
        clientSecret = (await stripe.paymentIntents.retrieve(pi)).client_secret;
      }
      if (!clientSecret) {
        clientSecret = rawInvoice.confirmation_secret?.client_secret ?? null;
      }
    }

    // ② expand が効かなかった場合: インボイスを別途取得して payment_intent を取り出す
    if (!clientSecret) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      type InvWithPI = { payment_intent?: string | { client_secret: string | null } | null; confirmation_secret?: { client_secret: string | null } | null };
      const inv = invoice as unknown as InvWithPI;
      if (inv.confirmation_secret?.client_secret) {
        clientSecret = inv.confirmation_secret.client_secret;
      } else if (typeof inv.payment_intent === "string") {
        clientSecret = (await stripe.paymentIntents.retrieve(inv.payment_intent)).client_secret;
      } else if (inv.payment_intent && typeof inv.payment_intent === "object") {
        clientSecret = inv.payment_intent.client_secret;
      }
    }

    if (!clientSecret) {
      // デバッグ情報をエラーに含めてStripe設定の問題を診断できるようにする
      const dbg = {
        subId: stripeSubscription.id,
        invoiceId,
        invType: typeof rawInvoice,
        piType: typeof rawInvoice !== "string" ? typeof rawInvoice?.payment_intent : "N/A",
        subStatus: stripeSubscription.status,
      };
      throw new Error(`Cannot retrieve client_secret — debug: ${JSON.stringify(dbg)}`);
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
