import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
const envText=await readFile('.env.local','utf8').catch(()=>'');
const values=new Map(envText.split(/\r?\n/).map(line=>line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].trim().replace(/^['"]|['"]$/g,'')]));
const privateNames=['SUPABASE_SECRET_KEY','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RESEND_API_KEY','ADMIN_TEST_PASSWORD'];
const checkedNames=[...privateNames,'NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_RAZORPAY_KEY_ID','OWNER_EMAIL','ADMIN_EMAIL'];
const needles=checkedNames.map(n=>values.get(n)).filter(v=>v&&v.length>=5).map(v=>Buffer.from(v));
const patterns=[/sb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}/g,/rzp_(?:test|live)_[A-Za-z0-9]{8,}/g,/\bre_[A-Za-z0-9_-]{24,}/g,/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,/postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/g,/\/Users\/[^\s/"']+/g];
const findings=[];
function scan(name,bytes,privateOnly=false){
  const text=bytes.toString('utf8');const positions=new Set();
  const checks=privateOnly?privateNames.map(n=>values.get(n)).filter(Boolean).map(v=>Buffer.from(v)):needles;
  for(const value of checks){const index=bytes.indexOf(value);if(index>=0)positions.add(index)}
  if(!privateOnly)for(const pattern of patterns){pattern.lastIndex=0;for(const m of text.matchAll(pattern))positions.add(Buffer.byteLength(text.slice(0,m.index)))}
  for(const offset of positions)findings.push({path:name,line:bytes.subarray(0,offset).toString().split('\n').length});
}
const tracked=git('ls-files','-z').split('\0').filter(Boolean);
for(const file of tracked){const bytes=await readFile(file).catch(()=>null);if(bytes)scan(file,bytes)}
const objects=git('rev-list','--objects','--all').trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf(' ');return {id:i<0?line:line.slice(0,i),name:i<0?'metadata':line.slice(i+1)}});
const packed=execFileSync('git',['cat-file','--batch'],{input:objects.map(o=>o.id).join('\n')+'\n',maxBuffer:1024*1024*1024});
let offset=0,blobs=0;
for(const object of objects){const end=packed.indexOf(10,offset),header=packed.subarray(offset,end).toString().split(' '),size=Number(header[2]);offset=end+1;const content=packed.subarray(offset,offset+size);offset+=size+1;if(header[1]==='blob'){scan(`history/${object.name}@${object.id.slice(0,12)}`,content);blobs++}else if(header[1]==='commit'||header[1]==='tag'){scan(`history/${object.id.slice(0,12)}`,content,true)}}
let bundles=0;
for(const file of await readdir('.next/static',{recursive:true}).catch(()=>[])){const bytes=await readFile(path.join('.next/static',file)).catch(()=>null);if(bytes){scan(`.next/static/${file}`,bytes,true);bundles++}}
await mkdir('test-results',{recursive:true});
await writeFile('test-results/secret-check.json',JSON.stringify({tracked_files:tracked.length,history_blobs:blobs,client_files:bundles,findings},null,2)+'\n');
for(const finding of findings)console.error(`${finding.path}:${finding.line}`);
console.log(`${findings.length?'FAIL':'PASS'}: ${tracked.length} tracked files, ${blobs} history blobs, ${bundles} client files; ${findings.length} flagged locations. No matching values printed.`);
if(findings.length)process.exitCode=1;
