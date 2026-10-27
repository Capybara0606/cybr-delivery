/** One configuration per independent restaurant deployment. No business rules here. */
export const installation = {
  brand: { name: "CYBR", descriptor: "DELIVERY / SYSTEM", theme: "cybr" },
  restaurant: { name: "Café Aurora", isDemonstration: true, city: "San Salvador" },
  locale: "es-SV",
  currency: "USD",
  timeZone: "America/El_Salvador",
} as const;
