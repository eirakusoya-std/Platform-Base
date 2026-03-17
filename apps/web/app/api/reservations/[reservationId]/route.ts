import { NextResponse } from "next/server";
import { cancelReservation } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ reservationId: string }> }) {
  try {
    const actor = await requireSessionUser();
    const { reservationId } = await context.params;
    const reservation = await cancelReservation(actor, reservationId);

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
