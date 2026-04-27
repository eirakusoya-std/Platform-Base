import { NextResponse } from "next/server";
import type { CreateTicketCheckoutInput, TicketType } from "@/app/lib/apiTypes";
import { requireSessionUser } from "@/app/lib/server/auth";
import { getUserById } from "@/app/lib/server/aimentStore";
import {
  activateMockTicketPurchase,
  createPendingTicketPurchase,
  listTicketPurchasesForUser,
  logPaymentEvent,
} from "@/app/lib/server/billingStore";
import { recordMonitoringEvent } from "@/app/lib/server/opsStore";
import { getBillingCancelUrl, getBillingSuccessUrl, getStripeClient, getStripePriceId } from "@/app/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTicketType(value: unknown): value is TicketType {
  return value === "1on1_10min" || value === "1on1_30min";
}

function getTargetUserId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const purchases = await listTicketPurchasesForUser(user.id);
    return NextResponse.json({ purchases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ticket purchases";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "billing.tickets.load_failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json().catch(() => ({}))) as CreateTicketCheckoutInput;
    if (!isTicketType(body.ticketType)) {
      return NextResponse.json({ error: "A valid ticket type is required" }, { status: 400 });
    }
    const targetUserId = getTargetUserId(body.targetUserId);
    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser || targetUser.role !== "vtuber") {
      return NextResponse.json({ error: "Target channel not found" }, { status: 404 });
    }
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: "You cannot buy a 1on1 ticket for your own channel" }, { status: 400 });
    }

    const stripe = await getStripeClient();
    const priceId = getStripePriceId(body.ticketType);
    const channelReturnPath = `/channels/${encodeURIComponent(targetUser.id)}`;

    if (!stripe || !priceId) {
      const purchase = await activateMockTicketPurchase(user.id, targetUser.id, body.ticketType);
      await recordMonitoringEvent({
        source: "billing",
        level: "info",
        code: "billing.mock_ticket.activated",
        message: `Mock ticket purchase activated: ${body.ticketType}`,
        meta: { userId: user.id, targetUserId: targetUser.id, ticketType: body.ticketType },
      });
      return NextResponse.json({ purchase, mode: "mock" }, { status: 201 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: getBillingSuccessUrl(channelReturnPath),
      cancel_url: getBillingCancelUrl(channelReturnPath),
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: user.id,
        targetUserId: targetUser.id,
        ticketType: body.ticketType,
      },
      payment_intent_data: {
        metadata: {
          userId: user.id,
          targetUserId: targetUser.id,
          ticketType: body.ticketType,
        },
      },
    });

    const purchase = await createPendingTicketPurchase({
      userId: user.id,
      targetUserId: targetUser.id,
      ticketType: body.ticketType,
      checkoutSessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url ?? undefined,
    });

    await logPaymentEvent({
      provider: "stripe",
      providerEventId: checkoutSession.id,
      type: "checkout.session.created",
      status: "received",
      summary: `Checkout session created for ${body.ticketType} to ${targetUser.id}`,
      relatedUserId: user.id,
    });

    return NextResponse.json({ purchase, checkoutUrl: checkoutSession.url, mode: "stripe" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ticket checkout";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "billing.ticket.create_failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
