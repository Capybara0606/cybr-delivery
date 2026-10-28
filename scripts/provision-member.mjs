import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const [restaurant,user,role,driver]=process.argv.slice(2);
const params=z.object({restaurant:z.uuid(),user:z.uuid(),role:z.enum(["owner","staff","driver"]),driver:z.uuid().optional()}).parse({restaurant,user,role,driver});
const url=z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
const secret=z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
const supabase=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const {error}=await supabase.rpc('provision_member',{p_restaurant:params.restaurant,p_user:params.user,p_role:params.role,p_driver:params.driver??null});
if(error){console.error('Provisioning failed:',error.code);process.exitCode=1;}
else console.log('Membership provisioned. No password or invitation was created or sent.');
