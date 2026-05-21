import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { listReservationsForSession } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function requireAdmin() {
  const user = await requireSessionUser();
  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(user.id)) {
    throw new Error("Forbidden");
  }
  return user;
}

/** GET /api/admin/reservations?sessionId=...
 *  Admin: view all reservations for any session
 */
export async function GET(req: Request) {
  try {
    const actor = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    const reservations = await listReservationsForSession(sessionId, actor);
    return NextResponse.json({ reservations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
