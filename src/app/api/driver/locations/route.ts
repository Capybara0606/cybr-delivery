import { apiFailure,restaurantId,noStore } from "@/lib/server/backend";
import { team,dbFailure } from "@/lib/server/team";
export async function GET(){try{const {db}=await team(["owner","staff"]);const {data,error}=await db.rpc("staff_active_locations",{p_restaurant:restaurantId()});dbFailure(error);return Response.json({locations:data},{headers:noStore});}catch(e){return apiFailure(e);}}
