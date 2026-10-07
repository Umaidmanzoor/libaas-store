import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { CatalogueProvider } from "@/components/catalogue-provider";
import { Checkout } from "@/components/checkout";
export const metadata = pageMetadata(
  "Checkout — Libaas",
  "Review your Libaas selection and delivery details.",
  "/checkout/",
  true,
);
import { getStorefront } from "@/lib/data";
import { backendConfigured } from "@/lib/env";
export const dynamic = "force-dynamic";
export default async function Page() {
  const catalogue=await getStorefront(),configured=catalogue.configured;
  return (
    <CatalogueProvider data={catalogue}><PageShell>
      <div className="page-heading">
        <p className="eyebrow mono">ONE LAST DETAIL</p>
        <h1>Make yourself at home.</h1>
      </div>
      {!configured&&<p className="small-note">{backendConfigured()?"Checkout is temporarily unavailable. Please refresh this page in a moment.":"Checkout is not configured yet. You can review your selection below."}</p>}
      <Checkout />
    </PageShell></CatalogueProvider>
  );
}
