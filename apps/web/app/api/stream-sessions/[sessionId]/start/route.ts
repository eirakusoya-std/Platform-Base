import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { setStreamSessionStatus } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const actor = await requireSessionUser();
    const { sessionId } = await context.params;
    const session = await setStreamSessionStatus(sessionId, actor, "live");

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
