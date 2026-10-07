import { pageMetadata, breadcrumbs } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { notFound } from "next/navigation";
import { getCollections } from "@/lib/data";
import { PageShell } from "@/components/page-shell";
import { Catalogue } from "@/components/catalogue";
export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ category: c.slug }));
}
export const revalidate = 60;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = (await getCollections()).find((c) => c.slug === category);
  return pageMetadata(
    `${c?.name ?? "Collection"} — Libaas`,
    `Explore the ${c?.name.toLowerCase() ?? "collection"} edit from Libaas.`,
    `/shop/${category}/`,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!(await getCollections()).some((c) => c.slug === category)) notFound();
  return (
    <PageShell>
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop/" },
          { name: category, path: `/shop/${category}/` },
        ])}
      />
      <Catalogue category={category} />
    </PageShell>
  );
}
