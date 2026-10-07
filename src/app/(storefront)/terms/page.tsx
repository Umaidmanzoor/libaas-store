import { LegalPage } from "@/components/legal-page";
import { getLegal } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
const page = getLegal()["terms"];
export const metadata = pageMetadata(
  `${page.title} — Libaas`,
  page.description,
  "/terms/",
);
export default function Page() {
  return <LegalPage slug="terms" />;
}
