import { NextResponse } from "next/server";
import { requestEmailVerification } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireSessionUser();
    const result = await requestEmailVerification(user.id);
    return NextResponse.json({ ok: true, devCode: result.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request email verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
