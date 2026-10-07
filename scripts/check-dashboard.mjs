import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY,publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!secret||!publishable){console.error('Database configuration is incomplete. Check .env.local.');process.exit(1);}
const options={auth:{persistSession:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(15000)})}};
const service=createClient(url,secret,options),publicClient=createClient(url,publishable,options);
const result=await service.rpc('admin_dashboard');
if(result.error){console.error(result.error.code==='PGRST202'?'Dashboard function missing: run all of supabase/part5.sql in Supabase SQL Editor, then run this check again.':'Dashboard check failed. Check the connection and migration; no credentials or order data are printed.');process.exit(1);}
if(!Array.isArray(result.data?.sums)||result.data.sums.length!==3||result.data.chart?.length!==30){console.error('Dashboard result has an unexpected format.');process.exit(1);}
const anonymous=await publicClient.rpc('admin_dashboard');
if(!anonymous.error||!['42501','PGRST202'].includes(anonymous.error.code)){console.error('Anonymous-access check failed or was inconclusive. Review migration grants.');process.exit(1);}
console.log('PASS dashboard function installed, summary format valid and anonymous access denied.');
