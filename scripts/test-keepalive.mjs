import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const source=await readFile('.github/workflows/keepalive.yml','utf8'),match=source.match(/node --input-type=module <<'JS'\n([\s\S]*?)\n\s+JS/);assert(match);
const code=match[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n'),dir=await mkdtemp(join(tmpdir(),'store-keepalive-'));
try{for(const [name,url,key,statuses,expected]of [['missing','','',[],0],['valid','https://db.example.test','test-public',[200],0],['transient','https://db.example.test','test-public',[503,200],0],['denied','https://db.example.test','test-public',[401],1],['invalid','http://db.example.test','test-public',[],1]]){
 const stub=`let statuses=${JSON.stringify(statuses)};globalThis.fetch=async()=>new Response('[]',{status:statuses.shift()??500});globalThis.setTimeout=(fn)=>{fn();return 0};\n`;
 const r=spawnSync(process.execPath,['--input-type=module','-'],{input:stub+code,encoding:'utf8',env:{...process.env,SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key,GITHUB_STEP_SUMMARY:join(dir,'summary')}});assert.equal(r.status,expected,name);assert(!r.stdout.includes(key)||!key);console.log('PASS keep-alive',name);
}}finally{await rm(dir,{recursive:true,force:true})}
