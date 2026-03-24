import { NextResponse } from "next/server";
import { resetStore } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset-store
 * KVストアをシードデータでリセットする管理エンドポイント。
 * ADMIN_SECRET環境変数で保護されています。
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await resetStore();
  return NextResponse.json({ ok: true, message: "Store reset to seed data" });
}
