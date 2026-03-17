import { NextResponse } from "next/server";
import { getStreamSessionById, updateStreamSession } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getStreamSessionById(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const actor = await requireSessionUser();
    const { sessionId } = await context.params;
    const body = await request.json();
    const session = await updateStreamSession(sessionId, actor, body);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
