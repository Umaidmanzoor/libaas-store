import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
export async function ownerSession(context,origin){
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
  const {data,error}=await db.auth.admin.generateLink({type:'magiclink',email:process.env.ADMIN_EMAIL});
  if(error)throw new Error('Owner test session unavailable');
  const jar=[];
  const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>jar,setAll:values=>jar.splice(0,jar.length,...values)}});
  const verified=await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'});
  if(verified.error)throw new Error('Owner test session verification failed');
  await context.addCookies(jar.map(({name,value})=>({name,value,url:origin,httpOnly:true,sameSite:'Lax'})));
  return {db,close:()=>auth.auth.signOut({scope:'local'})};
}
