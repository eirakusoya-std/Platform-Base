import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function GET() {
  const user = await resolveSessionUser();
  const isAdmin = Boolean(user && ADMIN_IDS.length > 0 && ADMIN_IDS.includes(user.id));
  return NextResponse.json({ user, isAuthenticated: Boolean(user), isAdmin });
}
