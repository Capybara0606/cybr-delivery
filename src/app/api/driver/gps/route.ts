import { z } from "zod";
import { apiFailure,readJson,sameOrigin,ApiError,noStore } from "@/lib/server/backend";
import { team,dbFailure } from "@/lib/server/team";
const position=z.object({assignment_id:z.uuid(),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy_m:z.number().min(0).max(1000),recorded_at:z.iso.datetime(),simulated:z.boolean().default(false)}).strict();
export async function POST(request:Request){try{sameOrigin(request);const p=position.parse(await readJson(request));const {db}=await team(["driver"]);if(p.simulated&&process.env.NEXT_PUBLIC_ENABLE_GPS_SIMULATION!=="true")throw new ApiError(403,"La simulación está deshabilitada.");const {error}=await db.rpc("publish_driver_location",{p_assignment:p.assignment_id,p_lat:p.lat,p_lng:p.lng,p_accuracy:p.accuracy_m,p_recorded_at:p.recorded_at,p_simulated:p.simulated});dbFailure(error);return Response.json({ok:true},{headers:noStore});}catch(e){return apiFailure(e);}}
