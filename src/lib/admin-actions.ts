"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin-auth";
import { sameOrigin,rateLimit } from "./ratelimit";
import { revalidateStorefront } from "./revalidation";
import { shippedEmail } from "./email";
import { getEnv } from "./env";
import { rupeesToPaise } from "./money";
const rupees=z.string().transform((value,ctx)=>{try{return rupeesToPaise(value);}catch{ctx.addIssue({code:"custom",message:"Enter rupees with up to two decimals."});return z.NEVER;}});
const id=z.uuid(),str=(max:number)=>z.string().trim().max(max), nonempty=(max:number)=>str(max).min(1);
async function gate(){const admin=await requireAdmin();if(!admin||!await sameOrigin()||!await rateLimit("admin-write",90,60))throw new Error("Not authorised");return admin.db;}
const go=(base:string,ok:boolean):never=>redirect(`${base}${base.includes("?")?"&":"?"}result=${ok?"saved":"error"}`);
function validPhotoUrl(src:string){
  if(/^\/img\/[a-zA-Z0-9/_-]+\.webp(?:\?v=[a-f0-9]+)?$/.test(src))return true;
  try{const url=new URL(src),project=new URL(getEnv()?.NEXT_PUBLIC_SUPABASE_URL||"http://invalid.local");return url.origin===project.origin&&url.pathname.startsWith("/storage/v1/object/public/product-images/products/");}catch{return false;}
}
const photoUrl=z.string().max(600).refine(validPhotoUrl);
const image=z.object({src:photoUrl,srcset:z.array(z.object({w:z.number().int(),src:photoUrl})).max(3).optional(),w:z.number().int().positive(),h:z.number().int().positive(),alt:nonempty(180),slot:str(150).optional(),colour:str(50).optional()});
const variant=z.object({id:id.optional(),sku:nonempty(80),size:nonempty(30),colour:nonempty(50),stock:z.number().int().min(0).max(100000),active:z.boolean().default(true),sort_order:z.number().int().default(0)});
const product=z.object({id:id.optional(),name:nonempty(120),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),category_id:id,technique:str(120),description:str(3000),craft:str(3000),care:str(3000),shipping:str(3000),price_rupees:rupees.pipe(z.number().int().positive()),compare_at_rupees:rupees.pipe(z.number().int().positive()).nullable(),featured:z.boolean(),status:z.enum(["draft","published","archived"]),images:z.array(image).max(8),variants:z.array(variant).min(1).max(80)}).refine(p=>new Set(p.variants.map(v=>v.sku.toUpperCase())).size===p.variants.length,{message:"Duplicate SKU"});
export async function saveProduct(_previous:{message:string},form:FormData):Promise<{message:string}>{
  const db=await gate();let raw:unknown;try{raw=JSON.parse(String(form.get("payload")||"null"));}catch{return {message:"Please review the product details and try again."};}const parsed=product.safeParse(raw);
  if(!parsed.success)return {message:"Check the required product fields, price, photos and variant details. Each variant needs a size and colour."};
  const p=parsed.data;
  const existing=p.id?await db.from("products").select("id,details,images").eq("id",p.id).maybeSingle():null;
  if(p.id&&!existing?.data)return {message:"This product is no longer available."};
  const conflicts=await db.from("variants").select("id,product_id").in("sku",p.variants.map(v=>v.sku));
  if(conflicts.error)return {message:"Could not check product variants. Please retry."};
  if(conflicts.data.some(v=>v.product_id!==p.id||!p.variants.some(input=>input.id===v.id)))return {message:"A SKU is already in use. Choose another SKU or leave it blank for an automatic one."};
  if(new Set(p.variants.map(v=>`${v.size.toLowerCase()}:${v.colour.toLowerCase()}`)).size!==p.variants.length)return {message:"Each variant must have a unique size and colour."};
  const existingVariants=p.id?await db.from("variants").select("id").eq("product_id",p.id):null;
  if(existingVariants?.error||p.variants.some(v=>v.id&&!existingVariants?.data?.some(old=>old.id===v.id)))return {message:"Variant details changed. Reload this product and try again."};
  const images=p.images.map((image,index)=>({...image,slot:image.slot||`products/${p.slug}/admin-${index}`}));
  const media:Record<string,{slot:string}>={};for(const colour of new Set(p.variants.map(v=>v.colour))){const slot=(images.find(im=>im.colour===colour)||images[0])?.slot;if(slot)media[colour]={slot};}
  const details={...(existing?.data?.details??{}),craft:p.craft,care:p.care,shipping:p.shipping,media};
  const row={name:p.name,slug:p.slug,category_id:p.category_id,technique:p.technique,description:p.description,details,price_paise:p.price_rupees,compare_at_paise:p.compare_at_rupees,featured:p.featured,status:p.id?p.status:"draft",images};
  const saved=p.id?await db.from("products").update(row).eq("id",p.id).select("id").single():await db.from("products").insert(row).select("id").single();
  if(saved.error||!saved.data)return {message:saved.error?.code==="23505"?"This product slug is already in use. Choose a different slug.":"The product could not be saved. Please try again."};
  const pid=saved.data!.id;
  const old=existingVariants??{data:[],error:null};
  if(old.error)return {message:"Variants could not be checked. Please retry."};
  const allowed=new Set((old.data??[]).map(v=>v.id));
  if(p.variants.some(v=>v.id&&!allowed.has(v.id)))return {message:"A variant no longer belongs to this product."};
  for(const [index,v] of p.variants.entries()){
    const values={product_id:pid,sku:v.sku,size:v.size,colour:v.colour,stock:v.stock,active:v.active,sort_order:index};
    const write=v.id?await db.from("variants").update(values).eq("id",v.id):await db.from("variants").insert(values);
    if(write.error){if(!p.id)await db.from("products").delete().eq("id",pid);return {message:"A variant could not be saved. Check that SKUs and size/colour pairs are unique."};}
  }
  const keep=new Set(p.variants.map(v=>v.id));
  for(const v of old.data??[])if(!keep.has(v.id)){const result=await db.from("variants").update({active:false}).eq("id",v.id);if(result.error)return {message:"A removed variant could not be deactivated. Please retry."};}
  const retained=new Set(images.flatMap(im=>[im.src,...(im.srcset??[]).map(v=>v.src)]));
  const removed=(Array.isArray(existing?.data?.images)?existing.data.images:[]).filter((im:{src:string})=>!retained.has(im.src));
  const paths=removed.flatMap((im:{src:string;srcset?:{src:string}[]})=>[im.src,...(im.srcset??[]).map(v=>v.src)]).map((src:string)=>{try{const path=new URL(src).pathname.split("/storage/v1/object/public/product-images/")[1];return path&&/^products\/[0-9a-f-]{36}\/(400|800|1600)\.webp$/.test(path)?path:null;}catch{return null;}}).filter((v:string|null):v is string=>!!v);
  if(paths.length)await db.storage.from("product-images").remove(paths);
  if(!p.id&&p.status!=="draft"){const published=await db.from("products").update({status:p.status}).eq("id",pid);if(published.error)return {message:"The draft was saved, but could not be published. Open it from Products and try again."};}
  revalidateStorefront();return go(`/admin/products/${pid}/`,true);
}
export async function duplicateProduct(form:FormData){const db=await gate(),parsed=id.safeParse(form.get("id"));if(!parsed.success)go("/admin/products/",false);const source=await db.from("products").select("*,variants(sku,size,colour,stock,active,sort_order)").eq("id",parsed.data).maybeSingle();if(!source.data)go("/admin/products/",false);const p=source.data;const {data,error}=await db.from("products").insert({slug:`${p.slug}-copy-${Math.random().toString(36).slice(2,6)}`,name:`${p.name} (copy)`,category_id:p.category_id,technique:p.technique,description:p.description,details:p.details,price_paise:p.price_paise,compare_at_paise:p.compare_at_paise,featured:false,status:"draft",images:p.images}).select("id").single();if(error||!data)go("/admin/products/",false);const variants=(p.variants??[]).map((v:{sku:string;size:string;colour:string;stock:number;sort_order:number},i:number)=>({product_id:data!.id,sku:`${v.sku}-COPY-${data!.id.slice(0,6)}-${i}`,size:v.size,colour:v.colour,stock:0,active:true,sort_order:v.sort_order}));if(variants.length)await db.from("variants").insert(variants);go(`/admin/products/${data!.id}/`,true);}
export async function archiveProduct(form:FormData){const db=await gate(),parsed=id.safeParse(form.get("id"));if(!parsed.success)go("/admin/products/",false);const result=await db.from("products").update({status:"archived"}).eq("id",parsed.data);if(!result.error)revalidateStorefront();go("/admin/products/",!result.error);}
const category=z.object({id:id.optional(),name:nonempty(80),slug:z.string().regex(/^[a-z0-9-]+$/),caption:str(300),sort_order:z.coerce.number().int().min(0).max(9999)});
export async function saveCategory(form:FormData){const db=await gate(),p=category.safeParse(Object.fromEntries(form));if(!p.success)go("/admin/categories/",false);const {id,...row}=p.data!;const result=id?await db.from("categories").update(row).eq("id",id):await db.from("categories").insert(row);if(!result.error)revalidateStorefront();go("/admin/categories/",!result.error);}
export async function deleteCategory(form:FormData){
  const db=await gate(),parsed=id.safeParse(form.get("id"));
  if(!parsed.success)go("/admin/categories/",false);
  const destination=form.get("destination");
  if(destination){
    const target=id.safeParse(destination);
    if(!target.success||target.data===parsed.data)go("/admin/categories/",false);
    const exists=await db.from("categories").select("id").eq("id",target.data).maybeSingle();
    if(exists.error||!exists.data)go("/admin/categories/",false);
    const moved=await db.from("products").update({category_id:target.data}).eq("category_id",parsed.data);
    if(moved.error)go("/admin/categories/",false);
    revalidateStorefront();
  }
  // Preserve products if a concurrent assignment prevents the final removal.
  const result=await db.from("categories").delete().eq("id",parsed.data).select("id");
  if(result.error?.code==="23503")redirect("/admin/categories/?result=category-in-use");
  if(result.error||!result.data?.length)go("/admin/categories/",false);
  revalidateStorefront();redirect("/admin/categories/?result=deleted");
}
const orderUpdate=z.object({id,from:z.enum(["paid","packed","shipped"]),to:z.enum(["packed","shipped","delivered"]),courier:str(100).optional(),tracking_id:str(120).optional(),note:str(3000).optional()});
export async function advanceOrder(form:FormData){const db=await gate(),p=orderUpdate.safeParse(Object.fromEntries(form));if(!p.success)go("/admin/orders/",false);const v=p.data!,base=`/admin/orders/${v.id}/`;if(!({paid:"packed",packed:"shipped",shipped:"delivered"} as Record<string,string>)[v.from]||({paid:"packed",packed:"shipped",shipped:"delivered"} as Record<string,string>)[v.from]!==v.to)go(base,false);if(v.to==="shipped"&&(!v.courier||!v.tracking_id))go(base,false);const row:Record<string,unknown>={status:v.to,admin_note:v.note??""};if(v.to==="shipped")Object.assign(row,{courier:v.courier,tracking_id:v.tracking_id,shipped_at:new Date().toISOString()});if(v.to==="delivered")row.delivered_at=new Date().toISOString();const result=await db.from("orders").update(row).eq("id",v.id).eq("status",v.from).select("id").maybeSingle();if(result.error||!result.data)go(base,false);if(v.to==="shipped"){const sent=await shippedEmail(v.id);if(!sent)await db.from("orders").update({admin_note:[v.note,"Shipping email needs review."].filter(Boolean).join("\n")}).eq("id",v.id);}go(base,true);}
const dateInput=z.union([z.literal(""),z.string().refine(v=>Number.isFinite(Date.parse(v)))]).optional();
const discount=z.object({id:id.optional(),code:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/),kind:z.enum(["percent","fixed"]),value:z.string(),min_subtotal_rupees:rupees,max_uses:z.union([z.coerce.number().int().positive(),z.literal("")]).transform(v=>v===""?null:v),starts_at:dateInput,expires_at:dateInput,active:z.boolean()}).refine(v=>v.kind==="percent"?/^\d+$/.test(v.value)&&Number(v.value)>0&&Number(v.value)<=100:(()=>{try{return rupeesToPaise(v.value)>0}catch{return false}})()).refine(v=>!v.starts_at||!v.expires_at||Date.parse(v.expires_at)>Date.parse(v.starts_at));
export async function saveDiscount(form:FormData){const db=await gate();const raw=Object.fromEntries(form);const p=discount.safeParse({...raw,active:form.get("active")==="on"});if(!p.success)go("/admin/discounts/",false);const {id,min_subtotal_rupees,...values}=p.data!;const row={...values,value:values.kind==="fixed"?rupeesToPaise(values.value):Number(values.value),min_subtotal_paise:min_subtotal_rupees,starts_at:values.starts_at?new Date(values.starts_at).toISOString():null,expires_at:values.expires_at?new Date(values.expires_at).toISOString():null};const result=id?await db.from("discount_codes").update(row).eq("id",id):await db.from("discount_codes").insert(row);go("/admin/discounts/",!result.error);}
export async function disableDiscount(form:FormData){const db=await gate(),parsed=id.safeParse(form.get("id"));if(!parsed.success)go("/admin/discounts/",false);const result=await db.from("discount_codes").update({active:false}).eq("id",parsed.data);go("/admin/discounts/",!result.error);}
export async function deleteSubscriber(form:FormData){const db=await gate(),parsed=id.safeParse(form.get("id"));if(!parsed.success)go("/admin/subscribers/",false);const result=await db.from("subscribers").delete().eq("id",parsed.data);redirect(`/admin/subscribers/?result=${result.error?"error":"deleted"}`);}
export async function updateMessage(form:FormData){const db=await gate(),parsed=z.object({id,status:z.enum(["new","read","archived"])}).safeParse(Object.fromEntries(form));if(!parsed.success)go("/admin/messages/",false);const result=await db.from("messages").update({status:parsed.data!.status}).eq("id",parsed.data!.id);go("/admin/messages/",!result.error);}
const settings=z.object({announcement_text:str(200),announcement_link:str(250),announcement_enabled:z.boolean(),shipping_fee_rupees:rupees,free_shipping_threshold_rupees:rupees,whatsapp_number:str(30),store_phone:str(30),store_email:z.union([z.string().trim().toLowerCase().max(254).pipe(z.email()),z.literal("")]),store_address:str(500),store_hours:str(200)});
export async function saveSettings(form:FormData){const db=await gate(),p=settings.safeParse({...Object.fromEntries(form),announcement_enabled:form.get("announcement_enabled")==="on"});if(!p.success)go("/admin/settings/",false);const {shipping_fee_rupees,free_shipping_threshold_rupees,...values}=p.data!;const result=await db.from("settings").upsert({id:1,...values,shipping_fee_paise:shipping_fee_rupees,free_shipping_threshold_paise:free_shipping_threshold_rupees});if(!result.error)revalidateStorefront();go("/admin/settings/",!result.error);}

export async function retryOrderEmails(form:FormData){
 const db=await gate(),parsed=id.safeParse(form.get("id"));
 if(!parsed.success)go("/admin/orders/",false);
 const {data:order}=await db.from("orders").select("paid_at").eq("id",parsed.data).maybeSingle();
 if(!order?.paid_at)go("/admin/orders/",false);
 const {orderEmails}=await import("./email");
 go(`/admin/orders/${parsed.data}/`,await orderEmails(parsed.data!));
}
