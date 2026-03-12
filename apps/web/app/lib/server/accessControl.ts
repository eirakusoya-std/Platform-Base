import type { SessionUser, StreamSession, SubscriptionPlan } from "../apiTypes";
import { canAccessPlan, getEffectivePlanForUser } from "./billingStore";

export async function getUserPlan(user: SessionUser | null | undefined): Promise<SubscriptionPlan> {
  if (!user) return "free";
  return getEffectivePlanForUser(user.id);
}

export async function canAccessSessionPlan(user: SessionUser | null | undefined, session: Pick<StreamSession, "requiredPlan" | "hostUserId">) {
  if (user && user.id === session.hostUserId) return true;
  const plan = await getUserPlan(user);
  return canAccessPlan(plan, session.requiredPlan);
}

export async function assertCanAccessSessionPlan(user: SessionUser | null | undefined, session: Pick<StreamSession, "requiredPlan" | "hostUserId">) {
  const allowed = await canAccessSessionPlan(user, session);
  if (!allowed) {
    throw new Error(`This session requires the ${session.requiredPlan} plan`);
  }
}
