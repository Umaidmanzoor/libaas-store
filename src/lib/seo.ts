import type { Metadata } from "next";
import { getSite, getImage, type Product } from "./catalogue";
export function absolute(path = "/") {
  return new URL(path, getSite().url).toString();
}
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  noindex = false,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absolute(path) },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: getSite().name,
      title,
      description,
      url: absolute(path),
      images: [
        {
          url: absolute("/og.png"),
          width: 1200,
          height: 630,
          alt: "Libaas Apparel & Design — store",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absolute("/og.png")],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}
export function productSchema(p: Product, uploadedImage?: string) {
  const image = getImage(p.media[p.color]?.slot ?? `products/${p.slug}/01`);
  const available = p.variants?.some(v => v.available > 0) ?? false;
  const currentPrice = p.variants?.length ? Math.min(...p.variants.map(v => v.pricePaise)) / 100 : p.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.slug,
    ...(uploadedImage || image ? { image: uploadedImage ?? absolute(image!.variants[2].webp) } : {}),
    offers: {
      "@type": "Offer",
      url: absolute(`/product/${p.slug}/`),
      price: currentPrice,
      priceCurrency: "INR",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}
