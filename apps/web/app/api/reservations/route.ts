import { NextResponse } from "next/server";
import type { CreateReservationInput } from "@/app/lib/apiTypes";
import { createReservation, listReservationsForSession, listReservationsForUser } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireSessionUser();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (sessionId) {
      if (actor.role === "vtuber") {
        const reservations = await listReservationsForSession(sessionId, actor);
        return NextResponse.json({ reservations });
      }

      const reservations = await listReservationsForUser(actor.id);
      return NextResponse.json({ reservations: reservations.filter((reservation) => reservation.sessionId === sessionId) });
    }

    const reservations = await listReservationsForUser(actor.id);
    return NextResponse.json({ reservations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reservations";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    const body = (await request.json()) as CreateReservationInput;
    const reservation = await createReservation(actor, body);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
