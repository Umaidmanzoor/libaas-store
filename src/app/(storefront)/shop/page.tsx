import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { Catalogue } from "@/components/catalogue";
export const metadata = pageMetadata(
  "The Collection — Libaas",
  "Explore sixteen shawls, phirans, suits and stoles in the Libaas collection.",
  "/shop/",
  false,
);
export default function Page() {
  return (
    <PageShell>
      <Catalogue />
    </PageShell>
  );
}
