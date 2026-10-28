import { execFileSync,spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium,expect } from '@playwright/test';
const status=JSON.parse(execFileSync('npx',['supabase','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert(['127.0.0.1','localhost'].includes(new URL(status.API_URL).hostname),'Flow test must use a local ephemeral Supabase instance');
const backend=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const restaurant='a0000000-0000-4000-8000-000000000001',driverId='f0000000-0000-4000-8000-000000000001';
const base='http://localhost:3100',run=randomUUID().slice(0,8),customer=`Cliente E2E ${run}`;
const employees=[],secrets=[status.SERVICE_ROLE_KEY],artifacts=process.env.CYBR_ARTIFACT_DIR||'test-results';
let browser,server,serverLog='';
const check=(value,label)=>assert(value,label);
const request=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
async function employee(role){const email=`flow-${run}-${role}@example.invalid`,password=`E2E!${randomUUID()}`;secrets.push(password);const {data,error}=await backend.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`${role} de pruebas`}});check(!error&&data.user,`Create ${role}`);employees.push(data.user.id);const p=await backend.rpc('provision_member',{p_restaurant:restaurant,p_user:data.user.id,p_role:role,p_driver:role==='driver'?driverId:null});check(!p.error,`Provision ${role}`);return {email,password};}
async function login(page,path,account){await page.goto(base+path);await page.getByLabel('Correo electrónico').fill(account.email);await page.getByLabel('Contraseña',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Iniciar sesión'}).click();}
try{
 const owner=await employee('owner'),driver=await employee('driver');
 const hours=Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d=>[d,[['00:00','23:59']]]));
 check(!(await backend.from('restaurant_settings').update({is_accepting_orders:true,opening_hours:hours}).eq('restaurant_id',restaurant)).error,'Open demo restaurant');
 server=spawn('npx',['next','dev','--hostname','127.0.0.1','--port','3100'],{detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SECRET_KEY:status.SERVICE_ROLE_KEY,ORDER_TOKEN_SECRET:randomUUID()+randomUUID(),RESTAURANT_ID:restaurant,NEXT_PUBLIC_ENABLE_GPS_SIMULATION:'true',NEXT_TELEMETRY_DISABLED:'1'}});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{serverLog=(serverLog+d.toString()).slice(-40000);});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}check(ready,'Next integration server ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 mkdirSync(artifacts,{recursive:true});
 const guestContext=await browser.newContext({viewport:{width:390,height:844}}),adminContext=await browser.newContext({viewport:{width:1440,height:1000}}),driverContext=await browser.newContext({viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:13.693,longitude:-89.218,accuracy:5}});
 const guest=await guestContext.newPage(),admin=await adminContext.newPage(),rider=await driverContext.newPage();
 const pageErrors=[];for(const p of [guest,admin,rider])p.on('pageerror',e=>pageErrors.push(e.message));
 await login(rider,'/driver',driver);await rider.getByRole('button',{name:/Fuera de turno/}).click();await expect(rider.getByRole('button',{name:/Estoy en turno/})).toBeVisible();
 await login(admin,'/admin',owner);await expect(admin.getByRole('heading',{name:/Tu cocina/})).toBeVisible();await expect(admin.locator('.sync-state')).toContainText('ACTUALIZACIÓN EN VIVO',{timeout:20000});
 await guest.goto(base);await expect(guest.getByRole('button',{name:/Capuchino/})).toBeVisible();
 await guest.screenshot({path:`${artifacts}/store-mobile.png`,fullPage:true});
 for(const width of [320,390,1440]){await guest.setViewportSize({width,height:900});check(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Store fits ${width}px`);}
 await guest.setViewportSize({width:390,height:844});
 await guest.getByRole('button',{name:/Capuchino/}).click();await guest.getByRole('button',{name:'Aumentar cantidad',exact:true}).click();await guest.getByRole('button',{name:/Agregar al pedido/}).click();
 await guest.getByRole('button',{name:/Croissant/}).click();await guest.getByRole('button',{name:/Agregar al pedido/}).click();
 await guest.getByRole('button',{name:/Ver mi pedido/}).click();
 await guest.getByLabel('Tu nombre',{exact:true}).fill(customer);await guest.getByLabel('Teléfono',{exact:true}).fill('+50370000000');await guest.getByLabel('Dirección de entrega',{exact:true}).fill('Calle ficticia 123, San Salvador');
 await expect(guest.getByText('$11.75',{exact:true})).toBeVisible();
 const sent=guest.waitForRequest(r=>r.url().endsWith('/api/orders')&&r.method()==='POST');
 await guest.getByRole('button',{name:'Confirmar pedido',exact:false}).click();const original=(await sent).postDataJSON();
 await guest.waitForURL(/\/track#token=/);const token=new URLSearchParams(new URL(guest.url()).hash.slice(1)).get('token');secrets.push(token);
 const receipt=await request('/api/tracking',{token});check(receipt.status===200&&receipt.data.total_cents===1175,'Server computed $11.75');check(!('_request_hash' in receipt.data)&&!('tracking_token_hash' in receipt.data),'No hash disclosure');
 const orderId=receipt.data.id,number=receipt.data.order_number,code=receipt.data.delivery_code;secrets.push(code);
 const duplicate=await request('/api/orders',original);check(duplicate.status===201&&duplicate.data.id===orderId,'Retry returns same order');
 check((await request('/api/orders',{...original,total_cents:1})).status===400,'Price tampering rejected');
 check((await request('/api/orders',{...original,idempotency_key:randomUUID(),lat:14,lng:-89})).status===400,'Outside coverage rejected');
 await backend.from('products').update({is_available:false}).eq('id','c0000000-0000-4000-8000-000000000001');
 check((await request('/api/orders',{...original,idempotency_key:randomUUID()})).status===400,'Sold-out product rejected');
 await backend.from('products').update({is_available:true}).eq('id','c0000000-0000-4000-8000-000000000001');
 check((await request('/api/tracking',{token:'0'.repeat(64)})).status===404,'Other order token rejected');
 check((await fetch(base+'/api/admin')).status===401,'Anonymous admin denied');
 const forbidden=await rider.request.get(base+'/api/admin');check(forbidden.status()===403,'Driver admin denied');
 console.log('PASS browser customer: menu, basket, exact total, guest checkout, retry, private tracking and negative cases');
 // Product CRUD through real forms, then remove the temporary product.
 admin.on('dialog',dialog=>dialog.accept());await admin.getByRole('button',{name:'Productos',exact:true}).click();await admin.getByRole('button',{name:'Nuevo producto',exact:false}).click();
 const editor=admin.getByRole('dialog');await editor.getByLabel('Nombre',{exact:true}).fill(`Especial E2E ${run}`);await editor.getByLabel('Descripción',{exact:true}).fill('Producto temporal de integración');await editor.getByLabel('Precio USD',{exact:true}).fill('1.50');await editor.getByRole('button',{name:'Guardar producto'}).click();await expect(editor).toHaveCount(0);
 const row=admin.getByRole('row').filter({hasText:`Especial E2E ${run}`});await expect(row).toBeVisible();await row.getByRole('button',{name:`Editar Especial E2E ${run}`}).click();await admin.getByRole('dialog').getByLabel('Precio USD',{exact:true}).fill('1.75');await admin.getByRole('button',{name:'Guardar producto'}).click();await expect(row.getByText('$1.75',{exact:true})).toBeVisible();await row.getByRole('button',{name:'Disponible',exact:true}).click();await expect(row.getByRole('button',{name:'Agotado',exact:true})).toBeVisible();await row.getByRole('button',{name:`Eliminar Especial E2E ${run}`}).click();await expect(row).toHaveCount(0);
 console.log('PASS browser administrator: product create/edit/availability/delete');
 await admin.getByRole('button',{name:'Pedidos',exact:true}).click();const card=admin.locator('.order-card').filter({hasText:`#${number}`});await expect(card).toBeVisible();await card.getByRole('button',{name:'Aceptar',exact:true}).click();await card.getByRole('button',{name:'Preparar',exact:true}).click();await card.getByRole('button',{name:'Listo para recoger',exact:true}).click();await card.getByRole('combobox').selectOption(driverId);await card.getByRole('button',{name:'Asignar',exact:true}).click();
 await expect(rider.getByRole('heading',{name:`Pedido #${number}`})).toBeVisible({timeout:20000});await rider.getByRole('button',{name:'Aceptar asignación',exact:false}).click();await rider.getByRole('button',{name:'Confirmar recogida',exact:false}).click();await rider.getByRole('button',{name:'Salir a entrega',exact:false}).click();
 await expect(rider.getByRole('button',{name:'Compartir GPS real',exact:false})).toBeVisible();
 await driverContext.setOffline(true);await expect(rider.getByText('Estás sin conexión.',{exact:false})).toBeVisible();await expect(rider.getByRole('button',{name:'Compartir GPS real',exact:false})).toBeDisabled();await driverContext.setOffline(false);
 await rider.getByRole('button',{name:'Compartir GPS real',exact:false}).click();await driverContext.setGeolocation({latitude:13.6931,longitude:-89.2181,accuracy:5});
 let location;for(let i=0;i<35;i++){const r=await request('/api/tracking',{token});if(r.data.location){location=r.data.location;break;}await new Promise(r=>setTimeout(r,500));}check(location&&!location.is_simulated,'Browser sensor emulation publishes authorized location');
 console.log('PASS browser driver: accept, collect, dispatch, offline handling, geolocation API (emulated sensor, NOT physical GPS certification)');
 await admin.screenshot({path:`${artifacts}/admin-orders.png`,fullPage:true});await rider.screenshot({path:`${artifacts}/driver-delivery.png`,fullPage:true});
 await rider.getByRole('button',{name:'Marcar llegada',exact:false}).click();await rider.getByLabel('Código que te dará el cliente').fill(code);await rider.getByRole('button',{name:'Confirmar entrega y cobro',exact:false}).click();await expect(rider.getByRole('heading',{name:'Todo listo para la próxima.'})).toBeVisible();
 const delivered=await request('/api/tracking',{token});check(delivered.data.status==='delivered'&&!delivered.data.location,'Delivered status removes public GPS');
 const payment=await backend.from('payments').select('status,amount_cents').eq('order_id',orderId).single();check(payment.data?.status==='collected'&&payment.data.amount_cents===1175,'Cash payment collected');
 const dashboard=await admin.request.get(base+'/api/admin');check((await dashboard.json()).dashboard.revenue_cents===1175,'Dashboard reflects sale');
 check((await rider.request.post(base+'/api/driver/gps',{data:{assignment_id:'00000000-0000-4000-8000-000000000000',lat:13.69,lng:-89.21,accuracy_m:5,recorded_at:new Date().toISOString(),simulated:false}})).status()===403,'GPS denied after delivery');
 check(!pageErrors.length,`No browser runtime errors: ${pageErrors.join('; ')}`);
 console.log('PASS full flow: $11.75 guest order -> kitchen -> assigned driver -> GPS -> code delivery -> recorded sale');
}catch(error){let message=String(error.stack||error);for(const secret of secrets.filter(Boolean))message=message.split(secret).join('[REDACTED]');console.error(message);if(process.env.CYBR_DEBUG_SERVER==='1'){let log=serverLog;for(const secret of secrets.filter(Boolean))log=log.split(secret).join('[REDACTED]');console.error(log);}process.exitCode=1;
}finally{
 await browser?.close();if(server?.pid){try{process.kill(-server.pid,'SIGTERM');}catch{}}
 // Only isolated test objects/accounts; this script refuses to use an arbitrary remote URL.
 const {data:orders}=await backend.from('orders').select('id,address_id').eq('customer_name',customer);
 for(const o of orders||[]){const {data:lines}=await backend.from('order_items').select('id').eq('order_id',o.id);for(const line of lines||[])await backend.from('order_item_options').delete().eq('order_item_id',line.id);for(const table of ['driver_locations']){const {data:assignments}=await backend.from('driver_assignments').select('id').eq('order_id',o.id);for(const a of assignments||[])await backend.from(table).delete().eq('assignment_id',a.id);}for(const table of ['order_events','driver_assignments','payments','order_items','order_status_history'])await backend.from(table).delete().eq('order_id',o.id);await backend.from('orders').delete().eq('id',o.id);await backend.from('delivery_addresses').delete().eq('id',o.address_id);}
 await backend.from('drivers').update({user_id:null,is_available:false}).eq('id',driverId);await backend.from('products').update({is_available:true}).eq('id','c0000000-0000-4000-8000-000000000001');await backend.from('products').delete().eq('name',`Especial E2E ${run}`);await backend.from('restaurant_settings').update({is_accepting_orders:false}).eq('restaurant_id',restaurant);
 for(const id of employees)await backend.auth.admin.deleteUser(id);
}
