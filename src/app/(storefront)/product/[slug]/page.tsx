import { pageMetadata, productSchema, breadcrumbs } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { notFound } from "next/navigation";
import { getProducts, getProduct, getStorefront } from "@/lib/data";
import { PageShell } from "@/components/page-shell";
import { ProductDetail } from "@/components/product-detail";
export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}
export const revalidate = 60;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  return pageMetadata(
    `${p?.name ?? "Piece"} — Libaas`,
    p?.description ?? "Libaas piece.",
    `/product/${slug}/`,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const slot = p.media[p.color]?.slot ?? `products/${p.slug}/01`;
  const uploadedImage = (await getStorefront()).images[slot]?.variants.at(-1)?.webp;
  return (
    <PageShell>
      <StructuredData data={productSchema(p, uploadedImage)} />
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop/" },
          { name: p.category, path: `/shop/${p.category}/` },
          { name: p.name, path: `/product/${p.slug}/` },
        ])}
      />
      <ProductDetail product={p} />
    </PageShell>
  );
}
