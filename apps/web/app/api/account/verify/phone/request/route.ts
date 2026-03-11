import { NextResponse } from "next/server";
import { requestPhoneVerification } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireSessionUser();
    const result = await requestPhoneVerification(user.id);
    return NextResponse.json({ ok: true, devCode: result.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request phone verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
