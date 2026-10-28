import { z } from "zod";
import { apiFailure,readJson,sameOrigin,restaurantId,ApiError,noStore } from "@/lib/server/backend";
import { team,dbFailure,orderColumns } from "@/lib/server/team";
const uuid=z.uuid();
const intervals=z.array(z.tuple([z.string().regex(/^\d{2}:\d{2}$/),z.string().regex(/^\d{2}:\d{2}$/)]).refine(([a,b])=>a<b,"Opening time must precede closing")).max(2);
const commands=z.discriminatedUnion("action",[
 z.object({action:z.literal("advance"),order_id:uuid,status:z.enum(["accepted","preparing","ready_for_pickup"])}),
 z.object({action:z.literal("assign"),order_id:uuid,driver_id:uuid}),z.object({action:z.literal("cancel"),order_id:uuid}),
 z.object({action:z.literal("save_product"),id:uuid.optional(),category_id:uuid,name:z.string().trim().min(1).max(120),description:z.string().max(1000),price_cents:z.number().int().min(0).max(1000000),is_available:z.boolean()}),
 z.object({action:z.literal("delete_product"),id:uuid}),
 z.object({action:z.literal("save_category"),id:uuid.optional(),name:z.string().trim().min(1).max(100)}),z.object({action:z.literal("delete_category"),id:uuid}),
 z.object({action:z.literal("settings"),delivery_fee_cents:z.number().int().min(0).max(100000),delivery_radius_m:z.number().int().min(100).max(50000),is_accepting_orders:z.boolean(),opening_hours:z.object({monday:intervals,tuesday:intervals,wednesday:intervals,thursday:intervals,friday:intervals,saturday:intervals,sunday:intervals})}),
]);
export async function GET(request:Request){try{const {db,role}=await team(["owner","staff"]);const id=restaurantId(),orderId=new URL(request.url).searchParams.get("order");if(orderId){uuid.parse(orderId);const {data:o,error}=await db.from("orders").select(orderColumns).eq("id",orderId).eq("restaurant_id",id).single();dbFailure(error);const [items,address,history]=await Promise.all([db.from("order_items").select("*,order_item_options(*)").eq("order_id",orderId),db.from("delivery_addresses").select("address,instructions").eq("id",o!.address_id).single(),db.from("order_status_history").select("new_status,event,created_at").eq("order_id",orderId).order("id")]);return Response.json({order:o,items:items.data,address:address.data,history:history.data},{headers:noStore});}
const result=await Promise.all([db.from("orders").select(orderColumns).eq("restaurant_id",id).order("created_at",{ascending:false}).limit(200),db.from("drivers").select("id,full_name,is_available,user_id").eq("restaurant_id",id),db.from("driver_assignments").select("*").eq("restaurant_id",id).in("status",["offered","accepted"]),db.from("products").select("*").eq("restaurant_id",id).order("name"),db.from("categories").select("*").eq("restaurant_id",id).order("sort_order"),db.from("restaurant_settings").select("*").eq("restaurant_id",id).single(),db.rpc("staff_dashboard",{p_restaurant:id})]);for(const r of result)dbFailure(r.error);const [orders,drivers,assignments,products,categories,settings,dashboard]=result;return Response.json({role,orders:orders.data,drivers:drivers.data,assignments:assignments.data,products:products.data,categories:categories.data,settings:settings.data,dashboard:dashboard.data},{headers:noStore});}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{sameOrigin(request);const c=commands.parse(await readJson(request));const {db,role}=await team(["owner","staff"]);const id=restaurantId();let error=null;
if(c.action==="advance")({error}=await db.rpc("advance_order",{p_order:c.order_id,p_status:c.status}));
if(c.action==="assign")({error}=await db.rpc("offer_assignment",{p_order:c.order_id,p_driver:c.driver_id}));
if(c.action==="cancel")({error}=await db.rpc("cancel_order",{p_order:c.order_id}));
if(c.action==="save_product"){const {action,id:productId,...fields}=c;void action;({error}=productId?await db.from("products").update(fields).eq("id",productId).eq("restaurant_id",id):await db.from("products").insert({...fields,restaurant_id:id}));}
if(c.action==="delete_product"){({error}=await db.from("products").delete().eq("id",c.id).eq("restaurant_id",id));if(error?.code==="23503")({error}=await db.from("products").update({is_available:false}).eq("id",c.id).eq("restaurant_id",id));}
if(c.action==="save_category")({error}=c.id?await db.from("categories").update({name:c.name}).eq("id",c.id).eq("restaurant_id",id):await db.from("categories").insert({restaurant_id:id,name:c.name}));
if(c.action==="delete_category")({error}=await db.from("categories").delete().eq("id",c.id).eq("restaurant_id",id));
if(c.action==="settings"){if(role!=="owner")throw new ApiError(403,"Solo el propietario puede cambiar la configuración.");const {action,...fields}=c;void action;({error}=await db.from("restaurant_settings").update(fields).eq("restaurant_id",id));}
dbFailure(error);return Response.json({ok:true},{headers:noStore});}catch(e){return apiFailure(e);}}
