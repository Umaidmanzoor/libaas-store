import images from "../../content/images.json";
import { site, notes } from "../../content/site";
import { commerce, craftStories } from "../../content/commerce";
import { atelier } from "../../content/atelier";
import { legal } from "../../content/legal";
export type Product = {
  id?: string; slug: string; name: string; category: string; technique: string;
  price: number; pricePaise?: number; color: string; sizes: string[]; colors: string[];
  description: string; featured: boolean; fabric: string; dimensions: string;
  media: Record<string, { slot: string }>;
  variants?: { id: string; size: string; colour: string; available: number; pricePaise: number }[];
};
export type ImageAsset = { width: number; height: number; sourceType?: string; variants: {width: number; webp: string; avif: string}[] };
export type Settings = {
  announcement_text: string; announcement_enabled: boolean; announcement_link: string;
  shipping_fee_paise: number; free_shipping_threshold_paise: number; whatsapp_number: string;
  store_phone: string; store_email: string; store_address: string; store_hours: string;
};
export type CatalogueSnapshot = {
  products: Product[];
  collections: {slug: string; name: string; caption: string; image_path?: string}[];
  settings: Settings; images: Record<string, ImageAsset>; configured: boolean;
};
export const defaultSettings: Settings = {
  announcement_text: "", announcement_enabled: false, announcement_link: "",
  shipping_fee_paise: commerce.shippingFee * 100, free_shipping_threshold_paise: commerce.shippingThreshold * 100,
  whatsapp_number: site.whatsapp, store_phone: "", store_email: "", store_address: "", store_hours: "",
};
export function price(value: number) { return `Rs ${value.toLocaleString("en-IN")}`; }
export const getSite = () => {
  let url = site.url;
  try {
    const candidate = new URL(process.env.NEXT_PUBLIC_SITE_URL || site.url);
    if (["http:", "https:"].includes(candidate.protocol)) url = candidate.origin;
  } catch { /* Preserve the existing safe origin when configuration is invalid. */ }
  return { ...site, url };
};
export const getAtelier = () => atelier;
export const getNotes = () => notes;
export const getLegal = () => legal;
export const getCraftStories = () => craftStories;
export const getImage = (slot: string): ImageAsset | undefined => (images as Record<string, ImageAsset>)[slot];
export function catalogueAccess(data: CatalogueSnapshot) {
  const getProduct = (slug: string) => data.products.find(p => p.slug === slug);
  const getProductMedia = (slug: string, color?: string) => {
    const product = getProduct(slug);
    return product?.media[color ?? product.color] ?? {slot: `products/${slug}/01`};
  };
  return {
    configured: data.configured,
    getProducts: () => data.products, getProduct,
    getFeaturedProducts: () => data.products.filter(p => p.featured),
    getCollections: () => data.collections,
    getSite: () => ({...getSite(), whatsapp: data.settings.whatsapp_number}),
    getSettings: () => data.settings,
    getCommerce: () => ({...commerce, shippingFee: data.settings.shipping_fee_paise / 100, shippingThreshold: data.settings.free_shipping_threshold_paise / 100}),
    getImage: (slot: string) => data.images[slot] ?? getImage(slot),
    getProductMedia,
    getProductImages: (slug: string, color?: string) => {
      const main = getProductMedia(slug, color).slot;
      return [main, ...Object.keys({...images, ...data.images}).filter(key => key.startsWith(`${main}-detail-`)).sort()];
    },
    getWhatsAppLink: (name: string) => /^\d{10,15}$/.test(data.settings.whatsapp_number)
      ? `https://wa.me/${data.settings.whatsapp_number}?text=${encodeURIComponent(`Hello, I would like to enquire about ${name}.`)}` : null,
  };
}
