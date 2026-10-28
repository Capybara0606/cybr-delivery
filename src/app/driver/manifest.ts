import type { MetadataRoute } from "next";
import baseManifest from "../manifest";
import { installation } from "@/config/installation";
export default function manifest(): MetadataRoute.Manifest {
  return {
    ...baseManifest(),
    id: "/driver",
    name: `${installation.restaurant.name} · Repartidores`,
    short_name: "Repartidores",
    start_url: "/driver",
  };
}
