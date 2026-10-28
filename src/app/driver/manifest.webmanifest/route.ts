import baseManifest from "@/app/manifest";
import { installation } from "@/config/installation";
export function GET() {
  return Response.json(
    {
      ...baseManifest(),
      id: "/driver",
      name: `${installation.restaurant.name} · Repartidores`,
      short_name: "Repartidores",
      start_url: "/driver",
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
