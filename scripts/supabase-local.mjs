import { spawn } from "node:child_process";
const child=spawn("npx",["supabase","start","--exclude","studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta"],{stdio:["ignore","pipe","pipe"]});
let output="";
for(const stream of [child.stdout,child.stderr]) stream.on("data",data=>{
 const value=data.toString();output+=value;
 // Do not emit CLI status tables containing keys. Bounded operational status only.
 for(const line of value.split(/\r?\n/)) if(/^(Starting|Waiting|Applying migration|Seeding|Finished|Started|Stopped|Stopping)/.test(line)) console.log(line);
});
child.on("exit",code=>{
 console.log(`Supabase local startup exit: ${code}`);
 if(code!==0) {
  const safe=output.split(/\r?\n/).filter(line=>/error|failed|denied|certificate|unhealthy|unknown field/i.test(line)&&!/(key|token|password|secret|jwt|postgres:\/\/)/i.test(line)).slice(-12);
  console.error(safe.join("\n"));
 }
 process.exitCode=code ?? 1;
});
