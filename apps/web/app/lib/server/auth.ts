import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "../apiTypes";
import { getUserById } from "./aimentStore";
import { attachBillingState } from "./billingStore";

export const SESSION_COOKIE = "aiment_dev_session";

export async function resolveSessionUser() {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!fromCookie) return null;
  const user = await getUserById(fromCookie);
  return attachBillingState(user);
}

export async function requireSessionUser() {
  const user = await resolveSessionUser();
  if (!user) throw new Error("No session user is configured");
  return user;
}

export function withSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function assertRole(user: SessionUser, role: UserRole) {
  if (user.role !== role) {
    throw new Error(`${role} role is required`);
  }
}
