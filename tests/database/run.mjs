import { spawnSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
const name = `cybr-db-test-${randomUUID().slice(0,8)}`;
const image = process.env.CYBR_TEST_POSTGRES_IMAGE || "postgis/postgis:17-3.5@sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6";
const docker = (...args) => { const r=spawnSync("docker",args,{encoding:"utf8"}); if(r.status!==0) throw new Error(r.stderr); return r.stdout.trim(); };
const testPassword=randomUUID();
let started=false;
try {
 docker("run","--rm","-d","--name",name,"-e",`POSTGRES_PASSWORD=${testPassword}`,"-p","127.0.0.1::5432",image); started=true;
 const port=docker("port",name,"5432/tcp").split(":").at(-1);
 const config={host:"127.0.0.1",port:Number(port),user:"postgres",password:testPassword,database:"postgres"};
 let admin;
 for(let i=0;i<100;i++) { try { admin=new Client(config);await admin.connect();break; } catch { await admin?.end().catch(()=>{});admin=null;await new Promise(r=>setTimeout(r,200)); } }
 if(!admin) throw new Error("Test PostgreSQL did not start");
 await admin.query('create database cybr_test template template0');await admin.end();
 const connection=JSON.stringify({...config,database:"cybr_test"});
 // In-memory child environment only; no credential files or output.
 const code=await new Promise((resolve,reject)=>{ const child=spawn("npx",["vitest","run",...process.argv.slice(2)],{stdio:"inherit",env:{...process.env,CYBR_TEST_DB:connection}}); child.on("error",reject);child.on("exit",resolve); });
 process.exitCode=code ?? 1;
} catch(error) { console.error(error.message);process.exitCode=1; }
finally { if(started) docker("stop",name); }
