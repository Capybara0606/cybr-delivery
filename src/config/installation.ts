/** One configuration per independent restaurant deployment. No business rules here. */
export const installation = {
  brand: { name: "CYBR", descriptor: "DELIVERY / SYSTEM", theme: "cybr" },
  restaurant: {
    name: process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Café Aurora",
    isDemonstration: true,
    city: "San Salvador",
  },
  copy: {
    headline: "Tu pausa.",
    highlight: "A domicilio.",
    description:
      "Café de especialidad, algo recién horneado y un buen comienzo. Directo de nuestra cocina a tu puerta.",
  },
  locale: "es-SV",
  currency: "USD",
  timeZone: "America/El_Salvador",
} as const;
