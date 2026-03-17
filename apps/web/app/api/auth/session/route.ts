import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await resolveSessionUser();
  return NextResponse.json({ user, isAuthenticated: Boolean(user) });
}
