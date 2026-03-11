import { NextResponse } from "next/server";
import { confirmEmailVerification } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    const nextUser = await confirmEmailVerification(user.id, body?.code ?? "");
    return NextResponse.json({ user: nextUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
