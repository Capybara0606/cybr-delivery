import { z } from "zod";
import {
  apiFailure,
  readJson,
  sameOrigin,
  hash,
  noStore,
} from "@/lib/server/backend";
import { team, dbFailure } from "@/lib/server/team";
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("availability"), available: z.boolean() }),
  z.object({
    action: z.literal("respond"),
    assignment_id: z.uuid(),
    accept: z.boolean(),
  }),
  z.object({
    action: z.enum(["picked_up", "on_the_way", "arrived", "delivered"]),
    order_id: z.uuid(),
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  }),
]);
export async function GET() {
  try {
    const { db } = await team(["driver"]);
    const { data, error } = await db.rpc("driver_workspace");
    dbFailure(error);
    return Response.json(data, { headers: noStore });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const c = command.parse(await readJson(request));
    const { db } = await team(["driver"]);
    if (c.action === "availability") {
      const { error } = await db.rpc("set_driver_availability", {
        p_available: c.available,
      });
      dbFailure(error);
    } else if (c.action === "respond") {
      const { error } = await db.rpc("respond_assignment", {
        p_assignment: c.assignment_id,
        p_accept: c.accept,
      });
      dbFailure(error);
    } else {
      const { data, error } = await db.rpc("driver_progress", {
        p_order: c.order_id,
        p_action: c.action,
        p_code_hash: c.code ? hash(c.code) : null,
      });
      dbFailure(error);
      if (!data?.ok)
        return Response.json(
          { error: data?.error || "No se pudo confirmar la entrega." },
          { status: 400, headers: noStore },
        );
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiFailure(e);
  }
}
