import { NextResponse } from "next/server";
import { getUserById, listStreamSessionsByHost } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params;
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const sessions = await listStreamSessionsByHost(userId);
    return NextResponse.json({
      channel: {
        userId: user.id,
        name: user.name,
        channelName: user.channelName ?? user.name,
        bio: user.bio ?? "",
        avatarUrl: user.avatarUrl ?? "",
        headerUrl: user.headerUrl ?? "",
        role: user.role,
      },
      sessions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load channel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
