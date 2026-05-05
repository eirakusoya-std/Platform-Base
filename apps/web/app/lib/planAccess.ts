import type { SubscriptionPlan } from "./apiTypes";

function rank(plan: SubscriptionPlan | undefined) {
  if (plan === "aimer") return 1;
  return 0;
}

export function canAccessRequiredPlan(currentPlan: SubscriptionPlan | undefined, requiredPlan: SubscriptionPlan | undefined) {
  return rank(currentPlan) >= rank(requiredPlan ?? "free");
}

export function planLabel(plan: SubscriptionPlan | undefined) {
  if (plan === "aimer") return "Aimer";
  return "Free";
}
