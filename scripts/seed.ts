import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import products from "../content/products.json";
import images from "../content/images.json";
import { collections } from "../content/site";
import { commerce } from "../content/commerce";
import type { ImageAsset } from "../src/lib/catalogue";

loadEnvConfig(process.cwd());
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ADMIN_EMAIL: z.email(),
});
async function main() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) throw new Error("Missing Supabase configuration or ADMIN_EMAIL. See README.md.");
  const env = parsed.data;
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {auth: {persistSession:false, autoRefreshToken:false}});
  // Verify the named owner exists before changing any catalogue rows.
  let owner: {id: string; email?: string} | undefined;
  for (let page = 1; ; page++) {
    const result = await db.auth.admin.listUsers({page, perPage:100});
    if (result.error) throw new Error("Could not read owner accounts. Check the Supabase secret key.");
    owner = result.data.users.find(u => u.email?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() && !!u.email_confirmed_at);
    if (owner || result.data.users.length < 100) break;
  }
  if (!owner) throw new Error("Create and confirm the ADMIN_EMAIL user in Supabase Authentication first.");
  const check = (error: unknown, step: string) => { if (error) throw new Error(`Seed failed at ${step}. Check schema.sql was run; no private details were logged.`); };
  for (const [sort_order, category] of collections.entries()) {
    const {error} = await db.from("categories").upsert({...category, sort_order, image_path:`collections/${category.slug}`}, {onConflict:"slug"});
    check(error, "categories");
  }
  const cats = await db.from("categories").select("id,slug");
  check(cats.error,"category lookup");
  for (const [sort_order, product] of products.entries()) {
    const media = Object.fromEntries(Object.entries(product.media).filter((entry): entry is [string, {slot:string}] => !!entry[1]));
    const slots = [...new Set([media[product.color].slot, ...Object.values(media).map(m=>m.slot)])];
    const photos = slots.flatMap(slot => {
      const photo = (images as Record<string,ImageAsset>)[slot];
      return photo ? [{slot, src:photo.variants[photo.variants.length-1].webp,
        srcset:photo.variants.map(v=>({w:v.width,src:v.webp})), w:photo.width, h:photo.height, alt:product.name}] : [];
    });
    const result = await db.from("products").upsert({
      slug:product.slug, name:product.name, category_id:cats.data?.find(c=>c.slug===product.category)?.id,
      technique:product.technique, description:product.description, price_paise:Math.round(product.price * 100),
      featured:product.featured, status:"published", sort_order, images:photos,
      details:{craft:product.technique, care:commerce.care, shipping:commerce.shippingNote, size_guide:commerce.sizeGuide,
        fabric:product.fabric, dimensions:product.dimensions, default_colour:product.color, media},
    }, {onConflict:"slug"}).select("id").single();
    check(result.error,"products");
    const variants = product.colors.flatMap((colour, colorIndex) => product.sizes.map((size,sizeIndex) => ({
      product_id:result.data!.id, sku:`${product.slug}-${colour}-${size}`.toUpperCase().replace(/\s+/g,"-"),
      colour,size,stock:8,active:true,sort_order:colorIndex * product.sizes.length + sizeIndex,
    })));
    // Existing inventory is never reset by a second seed run.
    check((await db.from("variants").upsert(variants,{onConflict:"sku",ignoreDuplicates:true})).error,"variants");
  }
  check((await db.from("settings").upsert({id:1, shipping_fee_paise:commerce.shippingFee*100, free_shipping_threshold_paise:commerce.shippingThreshold*100}, {onConflict:"id",ignoreDuplicates:true})).error,"settings");
  check((await db.from("admins").upsert({user_id:owner.id,email:env.ADMIN_EMAIL.toLowerCase()},{onConflict:"user_id"})).error,"owner");
  check((await db.from("discount_codes").upsert([
    {code:"WELCOME10",kind:"percent",value:10,min_subtotal_paise:0},
    {code:"LIBAAS500",kind:"fixed",value:50000,min_subtotal_paise:500000},
  ],{onConflict:"code",ignoreDuplicates:true})).error,"discounts");
  const counts: Record<string,number> = {};
  for (const table of ["categories","products","variants","settings","admins","discount_codes"]) {
    const {count,error} = await db.from(table).select("*",{count:"exact",head:true});
    check(error,"counts"); counts[table] = count ?? 0;
  }
  const expectedVariants = products.reduce((sum,p)=>sum+p.colors.length*p.sizes.length,0);
  if (counts.categories < collections.length || counts.products < products.length || counts.variants < expectedVariants || counts.admins < 1) throw new Error("Seed counts do not match the source catalogue.");
  // Verify public grants with a separate, unprivileged client.
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
  for (const table of ["orders","order_items","variants","subscribers","messages","settings","admins","stock_reservations","discount_codes","payment_events","rate_limits"]) {
    const {error} = await anon.from(table).select("*").limit(1);
    if (!error || error.code !== "42501") throw new Error(`Public access is not revoked for ${table}. Rerun schema.sql.`);
  }
  for (const table of ["categories","products"]) {
    const {data,error} = await anon.from(table).select("id").limit(1);
    if (error || !data?.length) throw new Error(`Public ${table} read failed.`);
  }
  console.log("Seed verified; public access checks passed. Counts:", JSON.stringify(counts));
}
main().catch(error => {
  // Only our own fixed error messages are emitted; SDK/network errors can include URLs or keys.
  const message = error instanceof Error && /^(Add the|Could not read owner|Create and confirm|Seed failed|Seed counts|Public access|Public (categories|products))/.test(error.message)
    ? error.message : "Seed could not finish. Check your connection, keys and schema; private error details were not logged.";
  console.error(message);
  process.exitCode = 1;
});
