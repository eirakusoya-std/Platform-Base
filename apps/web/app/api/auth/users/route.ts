import { NextResponse } from "next/server";
import { listUsers } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ users });
}
