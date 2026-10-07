import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { Catalogue } from "@/components/catalogue";
export const metadata = pageMetadata(
  "Saved Pieces — Libaas",
  "Return to your saved pieces in the Libaas store.",
  "/wishlist/",
  true,
);
export default function Page() {
  return (
    <PageShell>
      <Catalogue wishlist />
    </PageShell>
  );
}
