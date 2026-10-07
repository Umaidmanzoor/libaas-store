import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
type Summary={sums:number[];paid_count:number;chart:{day:string;amount:number}[];waiting:number;flagged:number;unread:number;top:{name:string;qty:number}[]};
export async function dashboardSummary(db:SupabaseClient):Promise<{summary:Summary;migrationNeeded:boolean}>{
  const rpc=await db.rpc("admin_dashboard");
  if(!rpc.error&&rpc.data)return {summary:rpc.data as Summary,migrationNeeded:false};
  if(rpc.error?.code!=="PGRST202")throw new Error("Dashboard totals unavailable");
  // Compatibility until the owner installs the SQL migration. Page through all
  // matching rows instead of silently truncating revenue at the API row limit.
  const today=new Date(new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"})+"T00:00:00+05:30").getTime();
  const start=today-29*86400000;
  const paid:{id:string;paid_at:string;total_paise:number}[]=[];
  const loadPaid=async()=>{for(let from=0;;from+=1000){
    const r=await db.from("orders").select("id,paid_at,total_paise").in("status",["paid","packed","shipped","delivered"]).gte("paid_at",new Date(start).toISOString()).order("id").range(from,from+999);
    if(r.error)throw new Error("Dashboard totals unavailable");paid.push(...r.data);if(r.data.length<1000)break;
  }
  };
  const top=new Map<string,number>();
  const loadTop=async()=>{for(let from=0;;from+=1000){
    const r=await db.from("order_items").select("id,name,qty,orders!inner(status,paid_at)").in("orders.status",["paid","packed","shipped","delivered"]).gte("orders.paid_at",new Date(start).toISOString()).order("id").range(from,from+999);
    if(r.error)throw new Error("Dashboard products unavailable");for(const i of r.data)top.set(i.name,(top.get(i.name)??0)+i.qty);if(r.data.length<1000)break;
  }
  };
  const [waiting,flagged,unread]=await Promise.all([
    db.from("orders").select("id",{count:"exact",head:true}).eq("status","paid"),
    db.from("orders").select("id",{count:"exact",head:true}).eq("needs_attention",true),
    db.from("messages").select("id",{count:"exact",head:true}).eq("status","new"),loadPaid(),loadTop()
  ]);
  if(waiting.error||flagged.error||unread.error)throw new Error("Dashboard counts unavailable");
  const sums=[0,6,29].map(days=>paid.filter(p=>Date.parse(p.paid_at)>=today-days*86400000).reduce((n,p)=>n+p.total_paise,0));
  const chart=Array.from({length:30},(_,i)=>{const time=start+i*86400000;return {day:new Date(time+19800000).toISOString().slice(0,10),amount:paid.filter(p=>Date.parse(p.paid_at)>=time&&Date.parse(p.paid_at)<time+86400000).reduce((n,p)=>n+p.total_paise,0)}});
  return {migrationNeeded:true,summary:{sums,chart,paid_count:paid.length,waiting:waiting.count??0,flagged:flagged.count??0,unread:unread.count??0,top:[...top].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([name,qty])=>({name,qty}))}};
}
