import { NextResponse } from "next/server";
import { searchUsers } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ users: [] });

  const users = await searchUsers(q);
  const safe = users.map((u) => ({
    id: u.id,
    name: u.name,
    channelName: u.channelName,
    avatarUrl: u.avatarUrl,
  }));
  return NextResponse.json({ users: safe });
}
