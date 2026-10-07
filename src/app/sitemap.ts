import type { MetadataRoute } from "next";
import { getCollections, getProducts } from "@/lib/data";
import { absolute } from "@/lib/seo";
export const revalidate = 60;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    "/",
    "/shop/",
    "/our-craft/",
    "/contact/",
    "/privacy/",
    "/terms/",
    "/shipping-returns/",
    ...(await getCollections()).map((c) => `/shop/${c.slug}/`),
    ...(await getProducts()).map((p) => `/product/${p.slug}/`),
  ].map((path) => ({
    url: absolute(path),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
