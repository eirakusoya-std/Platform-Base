import type { SubscriptionPlan } from "./apiTypes";

function rank(plan: SubscriptionPlan | undefined) {
  if (plan === "premium") return 2;
  if (plan === "supporter") return 1;
  return 0;
}

export function canAccessRequiredPlan(currentPlan: SubscriptionPlan | undefined, requiredPlan: SubscriptionPlan | undefined) {
  return rank(currentPlan) >= rank(requiredPlan ?? "free");
}

export function planLabel(plan: SubscriptionPlan | undefined) {
  if (plan === "premium") return "Premium";
  if (plan === "supporter") return "Supporter";
  return "Free";
}
