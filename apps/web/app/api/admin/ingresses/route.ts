// SOLID: S（LiveKit Ingress一覧取得・削除のAdmin APIに専念）
import { NextResponse } from "next/server";
import { listIngresses, deleteRtmpIngress } from "@repo/livekit";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function getLivekitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const host = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !host) throw new Error("LiveKit not configured");
  return { apiKey, apiSecret, host };
}

async function requireAdmin() {
  const user = await requireSessionUser();
  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(user.id)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    const config = getLivekitConfig();
    const ingresses = await listIngresses(config);
    return NextResponse.json({ ingresses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { ingressId } = (await request.json()) as { ingressId: string };
    if (!ingressId) return NextResponse.json({ error: "ingressId required" }, { status: 400 });
    const config = getLivekitConfig();
    await deleteRtmpIngress({ ...config, ingressId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
