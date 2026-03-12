import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { listConsentsForUser } from "@/app/lib/server/opsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const consents = await listConsentsForUser(user.id);
    return NextResponse.json({ consents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load consents";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
