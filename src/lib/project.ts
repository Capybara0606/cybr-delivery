import { installation } from "@/config/installation";
export const project = {
  name: "CYBR DELIVERY",
  phase: 8,
  currency: installation.currency,
  timeZone: installation.timeZone,
  restaurant: installation.restaurant.name,
} as const;
