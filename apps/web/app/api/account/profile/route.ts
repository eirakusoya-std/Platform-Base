import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { updateAccountProfile } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireSessionUser();
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireSessionUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      channelName?: string;
      bio?: string;
      phoneNumber?: string;
    };
    const user = await updateAccountProfile(currentUser.id, body);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
