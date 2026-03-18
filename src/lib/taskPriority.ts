import type { TaskPriority, UserTier } from "@/types";

export function getTaskPriorityForTier(tier: UserTier): TaskPriority {
  switch (tier) {
    case "professional":
      return "urgent";
    case "pay_as_you_go":
      return "high";
    default:
      return "normal";
  }
}
