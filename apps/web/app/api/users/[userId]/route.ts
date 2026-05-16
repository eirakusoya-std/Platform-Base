import { NextResponse } from "next/server";
import { getPublicUserProfile } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const profile = await getPublicUserProfile(userId);
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ profile });
}
