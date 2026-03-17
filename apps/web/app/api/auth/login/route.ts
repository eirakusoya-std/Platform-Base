import { NextResponse } from "next/server";
import type { LoginInput } from "@/app/lib/apiTypes";
import { loginUser } from "@/app/lib/server/aimentStore";
import { withSessionCookie } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginInput;
    const user = await loginUser(body);
    const response = NextResponse.json({ user, isAuthenticated: true });
    return withSessionCookie(response, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log in";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
