import { LegalPage } from "@/components/legal-page";
import { getLegal } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
const page = getLegal()["privacy"];
export const metadata = pageMetadata(
  `${page.title} — Libaas`,
  page.description,
  "/privacy/",
);
export default function Page() {
  return <LegalPage slug="privacy" />;
}
