import { LegalPage } from "@/components/legal-page";
import { getLegal } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
const page = getLegal()["shipping-returns"];
export const metadata = pageMetadata(
  `${page.title} — Libaas`,
  page.description,
  "/shipping-returns/",
);
export default function Page() {
  return <LegalPage slug="shipping-returns" />;
}
