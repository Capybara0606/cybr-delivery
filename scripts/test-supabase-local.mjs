import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
// CLI output includes local keys. Parse in memory, never log it or write it to disk.
const status=JSON.parse(execFileSync('npx',['supabase','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=status.API_URL, anonKey=status.ANON_KEY, serviceKey=status.SERVICE_ROLE_KEY;
assert(url&&anonKey&&serviceKey,'Local Supabase credentials not available');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,serviceKey,options),guest=createClient(url,anonKey,options);
const restaurant='a0000000-0000-4000-8000-000000000001',driver='f0000000-0000-4000-8000-000000000001';
const created=[];const objectPath=`${restaurant}/integration-${randomUUID()}.png`;
const check=(value,message)=>assert(value,message);
try {
 const {data:catalog,error:catalogError}=await guest.from('products').select('id,price_cents');check(!catalogError&&catalog?.length===12,'Anonymous real PostgREST catalog read');console.log('PASS real API: anonymous catalog has 12 products');
 const denied=await guest.from('orders').select('customer_phone');check(denied.error,'Anonymous order data must be denied');console.log('PASS real API: private orders denied');
 const signup=await guest.auth.signUp({email:`disabled-${randomUUID()}@example.invalid`,password:randomUUID()});check(signup.error,'Public signup must be disabled');console.log('PASS real Auth: public signup disabled');
 for(const role of ['owner','driver']) {
  const email=`cybr-test-${randomUUID()}@example.invalid`,password=`Test!${randomUUID()}`;
  const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Temporary integration test',role:'owner'}});
  check(!result.error&&result.data.user,'Create isolated confirmed test user without email');const user=result.data.user;created.push(user.id);
  const membership=await admin.rpc('provision_member',{p_restaurant:restaurant,p_user:user.id,p_role:role,p_driver:role==='driver'?driver:null});check(!membership.error,`Trusted provisioning ${role}: ${membership.error?.code}`);
  const session=createClient(url,anonKey,options);const signedIn=await session.auth.signInWithPassword({email,password});check(!signedIn.error,`Real password login ${role}: ${signedIn.error?.code ?? "unknown"}`);
  const verified=await session.auth.getUser();check(verified.data.user?.id===user.id,'JWT verified by Auth');
  const member=await session.from('restaurant_members').select('role').eq('user_id',user.id).single();check(member.data?.role===role,'RLS membership read');
  const escalation=await session.rpc('provision_member',{p_restaurant:restaurant,p_user:user.id,p_role:'owner',p_driver:null});check(escalation.error,'Authenticated client must not provision');
  const hashes=await session.from('orders').select('tracking_token_hash');check(hashes.error,'Hash column denied through actual REST');
  if(role==='driver') {
   check(!(await session.rpc('set_driver_availability',{p_available:true})).error,'Driver availability RPC');
   const edit=await session.from('products').update({price_cents:1}).eq('restaurant_id',restaurant).select('id');check(!edit.data?.length,'Driver cannot alter catalog');
   const upload=await session.storage.from('product-images').upload(objectPath,new Uint8Array([137,80,78,71]),{contentType:'image/png'});check(upload.error,'Driver cannot upload product imagery');
  } else {
   const upload=await session.storage.from('product-images').upload(objectPath,new Uint8Array([137,80,78,71]),{contentType:'image/png'});check(!upload.error,`Owner Storage upload: ${upload.error?.message}`);
   check(!(await session.storage.from('product-images').remove([objectPath])).error,'Owner can remove own product image');
  }
  await session.auth.signOut();console.log(`PASS real Auth/REST: ${role} login, role enforcement, no escalation, no hash disclosure`);
 }
 const coverage=await guest.rpc('check_delivery_coverage',{p_lat:13.6929,p_lng:-89.2182});check(!coverage.error&&coverage.data?.[0]?.is_covered,'Actual PostGIS RPC through REST');console.log('PASS real API: PostGIS coverage');
 console.log('PASS Supabase local Auth + PostgREST + Storage integration');
} finally {
 await admin.storage.from('product-images').remove([objectPath]);
 await admin.from('drivers').update({user_id:null,is_available:false}).eq('id',driver);
 for(const user of created) {const result=await admin.auth.admin.deleteUser(user);check(!result.error,'Temporary auth user cleanup');}
}
