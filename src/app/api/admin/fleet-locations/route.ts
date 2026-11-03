import { apiFailure, restaurantId, noStore } from "@/lib/server/backend";
import { team, dbFailure } from "@/lib/server/team";
export async function GET() {
  try {
    const { db } = await team(["owner", "staff"]);
    const { data, error } = await db.rpc("staff_shift_locations", {
      p_restaurant: restaurantId(),
    });
    dbFailure(error);
    return Response.json({ locations: data }, { headers: noStore });
  } catch (e) {
    const response = apiFailure(e);
    for (const [key, value] of Object.entries(noStore)) response.headers.set(key, value);
    return response;
  }
}
