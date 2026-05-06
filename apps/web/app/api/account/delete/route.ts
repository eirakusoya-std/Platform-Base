// SOLID: S（アカウント削除とセッションクリアに専念）
import { NextResponse } from "next/server";
import { requireSessionUser, clearSessionCookie } from "@/app/lib/server/auth";
import { deleteUser } from "@/app/lib/server/aimentStore";
import { recordMonitoringEvent } from "@/app/lib/server/opsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    await deleteUser(user.id);
    await recordMonitoringEvent({
      source: "system",
      level: "info",
      code: "account.deleted",
      message: `Account deleted: ${user.id}`,
      meta: { userId: user.id, role: user.role },
    });
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
