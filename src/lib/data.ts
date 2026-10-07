import "server-only";
import { cache } from "react";
import products from "../../content/products.json";
import { collections } from "../../content/site";
import { createAdminClient } from "./supabase/admin";
import { backendConfigured } from "./env";
import { getImage, defaultSettings, type CatalogueSnapshot, type Product, type ImageAsset } from "./catalogue";
export { getSite, getLegal, getAtelier, getNotes, getCraftStories, getImage, price } from "./catalogue";
export type { Product, ImageAsset } from "./catalogue";
const fallback: CatalogueSnapshot = {products: products.map(p => ({...p, media: Object.fromEntries(Object.entries(p.media).filter((entry): entry is [string, {slot:string}] => !!entry[1]))})), collections, settings: defaultSettings, images: {}, configured: false};
// Cache only within one server render. A failed database read must not keep
// checkout in fallback mode for later visitors after Supabase recovers.
export const getStorefront = cache(async (): Promise<CatalogueSnapshot> => {
  const db = backendConfigured() ? createAdminClient() : null;
  if (!db) return fallback;
  try {
    const [cats, items, settings, inventory] = await Promise.all([
      db.from("categories").select("id,slug,name,caption,image_path").order("sort_order"),
      db.from("products").select("id,slug,name,category_id,technique,description,details,price_paise,featured,images,variants(id,size,colour,active,sort_order)").eq("status", "published").order("sort_order"),
      db.from("settings").select("announcement_text,announcement_enabled,announcement_link,shipping_fee_paise,free_shipping_threshold_paise,whatsapp_number,store_phone,store_email,store_address,store_hours").eq("id", 1).maybeSingle(),
      db.rpc("storefront_variants"),
    ]);
    if (cats.error || items.error || settings.error || inventory.error || !settings.data) return fallback;
    const uploaded: Record<string, ImageAsset> = {};
    const mapped: Product[] = (items.data ?? []).map(p => {
      const variants = p.variants.filter(v => v.active).sort((a,b) => a.sort_order - b.sort_order);
      const colors = [...new Set(variants.map(v => v.colour))];
      const details = p.details ?? {};
      const media: Record<string, {slot: string}> = details.media ?? {};
      for (const [index, image] of (Array.isArray(p.images) ? p.images : []).entries()) {
        if (!image.src || !image.w || !image.h) continue;
        const slot = image.slot || `products/${p.slug}/${index === 0 ? "01" : `01-detail-${index}`}`;
        if (getImage(slot) && image.src.startsWith("/img/")) continue;
        uploaded[slot] = {width: image.w, height: image.h, sourceType: "image/webp", variants: [400,800,1600].map(width => {
          const source = Array.isArray(image.srcset) ? image.srcset.find((v: {w: number}) => v.w === width)?.src : null;
          return {width, webp: source || image.src, avif: source || image.src};
        })};
        if (index === 0 && !Object.keys(media).length) colors.forEach(color => { media[color] = {slot}; });
      }
      return {id:p.id, slug:p.slug, name:p.name, category:cats.data?.find(c=>c.id===p.category_id)?.slug ?? "",
        technique:p.technique, description:p.description, price:p.price_paise / 100, pricePaise:p.price_paise,
        featured:p.featured, color:details.default_colour ?? colors[0] ?? "", colors,
        sizes:[...new Set(variants.map(v=>v.size))], fabric:details.fabric ?? "Please enquire for fabric details.",
        dimensions:details.dimensions ?? "Please enquire for measurements.", media,
        variants: (inventory.data ?? []).filter((v:{product_id:string})=>v.product_id===p.id).map((v:{id:string;size:string;colour:string;available:number;price_paise:number})=>({id:v.id,size:v.size,colour:v.colour,available:v.available,pricePaise:v.price_paise}))};
    });
    return {products:mapped, collections:cats.data ?? [], settings:settings.data, images:uploaded, configured:true};
  } catch { return fallback; }
});
export async function getProducts() { return (await getStorefront()).products; }
export async function getProduct(slug: string) { return (await getProducts()).find(p=>p.slug === slug); }
export async function getCollections() { return (await getStorefront()).collections; }
export async function getSettings() { return (await getStorefront()).settings; }
