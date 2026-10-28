import "server-only";
import { createSupabaseServerClient } from "./server";
export async function requireRestaurantRole(restaurantId: string, roles: readonly ("owner" | "staff" | "driver")[]) {
  const supabase = await createSupabaseServerClient();
  // Server verification, not getSession() or client-provided role claims.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required");
  const { data: member, error: memberError } = await supabase.from("restaurant_members").select("role").eq("restaurant_id", restaurantId).eq("user_id", user.id).single();
  if (memberError || !member || !roles.includes(member.role)) throw new Error("Restaurant access denied");
  return { supabase, user, role: member.role as "owner" | "staff" | "driver" };
}
